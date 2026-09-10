import { expect, test } from "bun:test";
import { processPost } from "./pipeline";
import type { ask } from "./llm";

const posts = (await Bun.file("fixtures/reviews.jsonl").text()).trim().split("\n").map((line) => JSON.parse(line));
const extraction = {
  procedures: ["Double eyelid surgery"], operated_at: "하늘빛 신사점", surgeon: null,
  price_krw: 1500000, price_channel: "local", outcome: "positive", side_effects: [],
  allegations: [], sponsored: false, translation_en: "I had surgery at Haneulbit Sinsa.",
};
const verdict = { branch: "C001-SS", issues: [], fixed_translation_en: null, fixed_price_krw: null };

for (const [name, postId, extracted, verified, status, reason] of [
  ["clean agreement publishes", "r01", extraction, verdict, "publish", ""],
  ["unresolved error holds", "r01", extraction, { ...verdict, issues: ["Omitted numbness"] }, "hold", "verifier findings"],
  ["proposed correction still needs review", "r01", extraction, { ...verdict, issues: ["Omitted numbness"], fixed_translation_en: "I had numbness." }, "hold", "verifier findings"],
  ["unexplained correction holds", "r01", extraction, { ...verdict, fixed_price_krw: 1600000 }, "hold", "verifier findings"],
  ["verifier-only allegation holds", "r01", extraction, { ...verdict, issues: ["Agency misconduct omitted from allegations"] }, "hold", "verifier findings"],
  ["agency allegation holds", "r01", { ...extraction, allegations: ["Agency withheld aftercare information"] }, verdict, "hold", "allegation needs human"],
  ["abstention holds", "r01", extraction, { ...verdict, branch: null }, "hold", "disagrees"],
  ["unknown candidate holds", "r09", extraction, { ...verdict, branch: "INVENTED" }, "hold", "not a candidate"],
  ["initials cannot publish", "r04", extraction, { ...verdict, branch: "C001-GN" }, "hold", "initials"],
  ["negative price is rejected", "r01", { ...extraction, price_krw: -1 }, verdict, "hold", "agent step failed"],
  ["negative correction is rejected", "r01", extraction, { ...verdict, fixed_price_krw: -1 }, "hold", "agent step failed"],
] as const) {
  test(name, async () => {
    const responses: unknown[] = [extracted, verified];
    const agent: typeof ask = async (schema) => schema.parse(responses.shift());
    const result = await processPost(posts.find((p) => p.id === postId), agent);
    expect(result.status).toBe(status);
    expect(result.hold.join("; ")).toContain(reason);
    if (status === "publish") expect(result.branch).toBe("C001-SS");
  });
}

test("provider failure holds without terminating the pipeline", async () => {
  const agent: typeof ask = async () => { throw new Error("provider unavailable"); };
  const result = await processPost(posts[0], agent);
  expect(result.status).toBe("hold");
  expect(result.hold).toEqual(["agent step failed: provider unavailable"]);
});
