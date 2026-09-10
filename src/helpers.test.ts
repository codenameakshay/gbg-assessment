import { expect, test } from "bun:test";
import { chosung, resolve, type Clinic } from "./clinics";
import { dedupe, type Review } from "./dedup";

type Label = { branch: string | null; dup_of: string | null; also_quoted?: string[] };
const reviews: Review[] = (await Bun.file("fixtures/reviews.jsonl").text())
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const clinics: Clinic[] = await Bun.file("fixtures/clinics.json").json();
const labels: Record<string, Label> = await Bun.file("fixtures/labels.json").json();

test("chosung", () => expect(chosung("하늘빛 강남역")).toBe("ㅎㄴㅂ ㄱㄴㅇ"));

test.each(reviews.map((r) => [r.id, r] as const))("resolve %s: confident only when right", (_, r) => {
  const label = labels[r.id]!;
  const expected = label.branch ? [label.branch, ...(label.also_quoted ?? [])] : [];
  const { candidates, confident } = resolve(r.text, clinics);
  expect(candidates.map((c) => c.branch)).toEqual(expect.arrayContaining(expected));
  expect(confident).toBe(expected.length === 1);
});

test("initials ㅎㄴ near ㄱㄴ역 could be 하늘빛 or 하늘: both surface, neither is picked", () => {
  const { candidates, confident } = resolve(reviews.find((r) => r.id === "r04")!.text, clinics);
  expect(candidates.map((c) => c.branch).sort()).toEqual(["C001-GN", "C005-GN"]);
  expect(confident).toBe(false);
});

test("dedupe merges the cross-post but not the same author's follow-up", () => {
  const canonical = dedupe(reviews);
  for (const r of reviews) expect([r.id, canonical.get(r.id)]).toEqual([r.id, labels[r.id]!.dup_of ?? r.id]);
});
