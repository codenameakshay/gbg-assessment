export type Branch = { id: string; name_ko: string; area: string; area_en: string };
export type Clinic = {
  id: string;
  name_ko: string;
  name_en: string;
  aliases: string[];
  former_names: string[];
  branches: Branch[];
};
export type Candidate = { clinic: string; branch: string | null; via: "name" | "initials" };
type Span = { start: number; end: number; initials: boolean };

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const SUFFIX = /(성형외과의원|성형외과|의원)$/;
const WINDOW = 15; // ponytail: branch = an area named near the clinic; use LLM-extracted branch hints if this misfires

const isJamo = (ch = "") => ch >= "ㄱ" && ch <= "ㅎ";

/** 하 → ㅎ. Anything that isn't a Hangul syllable passes through unchanged. */
export const initial = (ch: string) => {
  const i = ch.charCodeAt(0) - 0xac00;
  return i >= 0 && i < 11172 ? CHO[Math.floor(i / 588)]! : ch;
};
export const chosung = (s: string) => [...s].map(initial).join("");

/**
 * Where `form` appears in `text`: literally (하늘빛), with syllables written as initials (ㄱㄴ역 = 강남역),
 * or as bare initials of its first 2+ syllables (ㅎㄴ → 하늘빛). Forums ban clinic names, so users write initials.
 */
export function find(text: string, form: string): Span[] {
  const t = text.toLowerCase();
  const f = form.toLowerCase();
  const out: Span[] = [];
  for (let i = 0; i < t.length; i++) {
    let k = 0;
    let jamo = 0;
    while (k < f.length && (t[i + k] === f[k] || t[i + k] === initial(f[k]!))) {
      if (t[i + k] !== f[k]) jamo++;
      k++;
    }
    const allInitials = k > 0 && jamo === k;
    const ok = allInitials
      ? k >= 2 && !isJamo(t[i - 1]) && !isJamo(t[i + k]) && new Set(t.slice(i, i + k)).size > 1 // not ㅋㅋ/ㅎㅎ
      : k === f.length;
    if (ok) out.push({ start: i, end: i + k, initials: jamo > 0 });
  }
  return out;
}

/**
 * Deterministic candidate generation for "which clinic/branch is this review about".
 * `confident` only when one branch is named outright; everything else goes to the LLM/agent/human step.
 */
export function resolve(text: string, clinics: Clinic[]) {
  const t = text.toLowerCase();
  const hits: (Span & { clinic?: Clinic })[] = [];
  for (const c of clinics) {
    const names = [c.name_ko, c.name_en, ...c.aliases, ...c.former_names];
    const forms = new Set([...names, ...names.map((n) => n.replace(SUFFIX, ""))].filter((n) => n.length >= 2));
    for (const f of forms) hits.push(...find(t, f).map((s) => ({ ...s, clinic: c })));
  }
  for (const area of new Set(clinics.flatMap((c) => c.branches.map((b) => b.area)))) hits.push(...find(t, area));

  // A mention inside a longer one belongs to the longer one: 하늘 inside 하늘빛, ㄱㄴ inside ㄱㄴ역.
  const kept = hits.filter(
    (h) => h.clinic && !hits.some((o) => o.start <= h.start && h.end <= o.end && o.end - o.start > h.end - h.start),
  );

  const candidates: Candidate[] = [];
  for (const [c, hs] of Map.groupBy(kept, (h) => h.clinic!)) {
    const via = hs.some((h) => !h.initials) ? "name" : "initials";
    const near = hs.map((h) => t.slice(Math.max(0, h.start - WINDOW), h.end + WINDOW)).join(" ");
    const named = c.branches.filter((b) => find(near, b.area).length || near.includes(b.area_en.toLowerCase()));
    const branches = named.length ? named : c.branches.length === 1 ? c.branches : [null];
    for (const b of branches) candidates.push({ clinic: c.id, branch: b?.id ?? null, via });
  }

  // Initials alone never count: two consonants collide across a city's clinics, and the registry is never complete.
  const [only] = candidates;
  const confident = candidates.length === 1 && only!.branch !== null && only!.via === "name";
  return { candidates, confident };
}
