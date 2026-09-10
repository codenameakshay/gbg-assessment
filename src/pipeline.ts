import { mkdir } from "node:fs/promises";
import { z } from "zod";
import { resolve, type Clinic } from "./clinics";
import { dedupe, type Review } from "./dedup";
import { ask, BACKEND, MODEL } from "./llm";

// dedupe → match (code) → extract (agent 1) → verify (agent 2) → publish rules (code) → eval vs labels
type Post = Review & { source: string; url: string; author: string; lang: string; attachments: string[] };
type Label = { branch: string | null; dup_of: string | null; sponsored: boolean };

const Extraction = z.object({
  procedures: z.array(z.string()).describe("English procedure names"),
  operated_at: z.string().nullable().describe("Clinic where the procedure was actually done, exactly as written"),
  surgeon: z.string().nullable(),
  price_krw: z.number().nullable().describe("What the reviewer actually paid, in KRW"),
  price_channel: z.enum(["local", "agency", "quote", "unknown"]),
  outcome: z.enum(["positive", "mixed", "negative"]),
  side_effects: z.array(z.string()),
  allegations: z.array(z.string()).describe("Accusations of misconduct against the clinic or doctor"),
  sponsored: z.boolean(),
  translation_en: z.string(),
});

const Verdict = z.object({
  branch: z.string().nullable().describe("Candidate branch id where the procedure was done, or null to abstain"),
  issues: z.array(z.string()).describe("Concrete mistakes in the extraction; empty if none"),
  fixed_translation_en: z.string().nullable(),
  fixed_price_krw: z.number().nullable(),
});

const EXTRACT = `You extract facts from Korean (or English) cosmetic-surgery reviews for English-speaking readers.
- operated_at: the clinic where the reviewer actually had the procedure, copied exactly as written (it may be initials like ㅎㄴ). Clinics only consulted or quoted do not count. null if not stated.
- Korean prices use 만원 shorthand: "150" means 1,500,000 KRW. price_krw is what they paid. price_channel: local if paid directly, agency if through a broker, quote if only quoted.
- side_effects and allegations: keep them exactly as strong as the original. Never soften (감각이 둔했다 is numbness, not "felt different").
- sponsored: true if the post discloses payment, free treatment or a sponsored-reviewer programme (체험단, 원고료, 지원받아, 협찬).
- translation_en: complete and faithful. Keep clinic names as written, romanised.`;

const VERIFY = `You are the second check before a clinic review is published. You get the original post, another model's extraction, and the registry branches that code matched in the text.
1. branch: return the candidate branch id where the procedure was done, only if the post names that clinic clearly (a clinic's only branch counts as named with the clinic). If the only evidence is initials, or more than one candidate fits, return null. Never return an id that is not in the candidate list.
2. Compare translation_en with the original sentence by sentence. List every omission, softened side effect or wrong number in issues, and give fixed_translation_en. Otherwise fixed_translation_en is null.
3. Check price_krw against the original. If wrong, say so in issues and give fixed_price_krw; otherwise null.`;

const SPONSORED = /원고료|지원받아|제공받아|협찬|체험단/;

const posts: Post[] = (await Bun.file("fixtures/reviews.jsonl").text()).trim().split("\n").map((l) => JSON.parse(l));
const clinics: Clinic[] = await Bun.file("fixtures/clinics.json").json();
const labels: Record<string, Label> = await Bun.file("fixtures/labels.json").json();
// The verifier must see the same registry facts the matcher used (former names, only-branch),
// otherwise it abstains on matches it has no way to check.
const describe = new Map(
  clinics.flatMap((c) => c.branches.map((b) => [b.id, [
    `${c.name_ko} / ${c.name_en}`,
    c.former_names.length ? ` (formerly ${c.former_names.join(", ")})` : "",
    `, ${b.name_ko} (${b.area_en})`,
    c.branches.length === 1 ? ", the clinic's only branch" : "",
  ].join("")])),
);

async function processPost(p: Post) {
  const t0 = performance.now();
  const match = resolve(p.text, clinics);
  const cross_posts = posts.filter((q) => q.id !== p.id && canonical.get(q.id) === p.id).map((q) => q.url);
  const base = { id: p.id, source: p.url, cross_posts, candidates: match.candidates };
  try {
    const x = await ask(Extraction, EXTRACT, p.text);
    const cands = match.candidates.map(
      (c) => `${c.branch ?? `${c.clinic} (branch unknown)`}: ${describe.get(c.branch ?? "") ?? c.clinic} [matched by ${c.via}]`,
    );
    const v = await ask(
      Verdict,
      VERIFY,
      `ORIGINAL POST:\n${p.text}\n\nEXTRACTION:\n${JSON.stringify(x, null, 2)}\n\nCANDIDATES:\n${cands.join("\n") || "(none)"}`,
    );

    // Publish rules the models cannot override.
    const hold: string[] = [];
    const byBranch = new Map(match.candidates.map((c) => [c.branch, c]));
    let branch = match.confident ? match.candidates[0]!.branch : v.branch;
    if (match.confident && v.branch !== branch) hold.push(`verifier disagrees with matcher (${v.branch ?? "abstained"})`);
    if (branch && !byBranch.has(branch)) { hold.push(`verifier picked ${branch}, not a candidate`); branch = null; }
    if (branch && byBranch.get(branch)!.via === "initials") { hold.push("clinic known only from initials"); branch = null; }
    if (!branch) hold.push("clinic/branch not certain");
    if (x.allegations.length) hold.push(`allegation needs human review: ${x.allegations.join("; ")}`);

    const sponsored = x.sponsored || SPONSORED.test(p.text);
    const clinic_owned_source = p.source === "clinic_site";
    return {
      ...base,
      status: hold.length ? "hold" : "publish",
      hold,
      branch,
      procedures: x.procedures,
      surgeon: x.surgeon,
      price_krw: v.fixed_price_krw ?? x.price_krw,
      price_channel: x.price_channel,
      outcome: x.outcome,
      side_effects: x.side_effects,
      allegations: x.allegations,
      translation_en: v.fixed_translation_en ?? x.translation_en,
      verifier_issues: v.issues,
      // ponytail: hand-set weights; fit them on labelled outcomes once there are enough
      trust: { sponsored, clinic_owned_source, receipt: p.attachments.includes("receipt"),
        rating_weight: sponsored ? 0 : clinic_owned_source ? 0.3 : 1 },
      secs: Math.round((performance.now() - t0) / 100) / 10,
    };
  } catch (e) {
    return { ...base, status: "hold", hold: [`agent step failed: ${(e as Error).message}`], branch: null };
  }
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>) {
  const out: R[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); }
  }));
  return out;
}

const started = performance.now();
const canonical = dedupe(posts);
const unique = posts.filter((p) => canonical.get(p.id) === p.id);
const results = await pool(unique, 5, async (p) => {
  const r = await processPost(p);
  console.log(`[${r.id}] ${r.status}${r.branch ? ` ${r.branch}` : ""}${r.hold.length ? ` (${r.hold.join(" | ")})` : ""}`);
  return r;
});

// Eval against hand labels. False attributions are the number that matters.
const published = results.filter((r) => r.status === "publish");
const held = results.filter((r) => r.status === "hold");
const wrong = published.filter((r) => r.branch !== labels[r.id]!.branch);
const dupOk = posts.filter((p) => canonical.get(p.id) === (labels[p.id]!.dup_of ?? p.id)).length;
const sponsoredIds = posts.filter((p) => labels[p.id]!.sponsored).map((p) => p.id);
const caught = sponsoredIds.filter((id) => results.find((r) => r.id === id && "trust" in r && r.trust.sponsored));
const issues = results.flatMap((r) => ("verifier_issues" in r ? r.verifier_issues.map((i) => `${r.id}: ${i}`) : []));

const report = `# Pipeline run

${BACKEND} · ${MODEL} · ${posts.length} posts → ${unique.length} unique · ${((performance.now() - started) / 1000).toFixed(0)}s

| Check | Result |
|---|---|
| Duplicates resolved correctly | ${dupOk}/${posts.length} |
| Published | ${published.length} |
| Held for a human | ${held.length} |
| **False attributions (published to the wrong branch)** | **${wrong.length}** |
| Sponsored posts caught | ${caught.length}/${sponsoredIds.length} |
| Verifier corrections | ${issues.length} |

| Post | Status | Branch | Held because |
|---|---|---|---|
${results.map((r) => `| ${r.id} | ${r.status} | ${r.branch ?? "-"} | ${r.hold.join("; ") || "-"} |`).join("\n")}

## Verifier corrections
${issues.map((i) => `- ${i}`).join("\n") || "- none"}
`;

await mkdir("out", { recursive: true });
await Bun.write("out/published.json", JSON.stringify(published, null, 2));
await Bun.write("out/held.json", JSON.stringify(held, null, 2));
await Bun.write("out/report.md", report);
console.log(`\n${report}`);
