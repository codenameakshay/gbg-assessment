import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Smoke test: API key works + structured output on the first fixture review.
const Extract = z.object({
  procedures: z.array(z.string()).describe("English procedure names, e.g. 'double eyelid surgery (incisional)'"),
  clinic_mention: z.string().nullable().describe("Clinic name exactly as written, including initials like ㅎㄴ"),
  price_krw: z.number().nullable().describe("Price actually paid, in KRW. Korean shorthand '150' means 1,500,000"),
  translation_en: z.string(),
});

const [review] = (await Bun.file("fixtures/reviews.jsonl").text())
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

const client = new Anthropic();
const res = await client.beta.messages.parse({
  model: "claude-opus-5",
  max_tokens: 16000,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
  output_config: { format: betaZodOutputFormat(Extract), effort: "low" },
  messages: [{ role: "user", content: `Extract fields from this clinic review:\n\n${review.text}` }],
});

if (res.stop_reason === "refusal") throw new Error(`refused: ${res.stop_details?.category}`);
console.log(res.parsed_output);
