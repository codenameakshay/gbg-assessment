import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = "claude-opus-5";
export const BACKEND = process.env.ANTHROPIC_API_KEY ? "anthropic-api" : "claude-cli";
const AGENT_TIMEOUT_MS = 120_000;

/** One agent step: system prompt + input in, schema-checked object out. One retry with the validation error. */
export async function ask<S extends z.ZodType>(schema: S, system: string, input: string): Promise<z.infer<S>> {
  let prompt = input;
  for (let attempt = 1; ; attempt++) {
    const raw = BACKEND === "anthropic-api" ? await viaApi(schema, system, prompt) : await viaCli(schema, system, prompt);
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    if (attempt === 2) throw new Error(`schema check failed twice: ${parsed.error.message}`);
    prompt = `${input}\n\nYour previous answer failed validation:\n${parsed.error.message}\nFix it.`;
  }
}

async function viaApi(schema: z.ZodType, system: string, input: string) {
  const res = await new Anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    output_config: { format: betaZodOutputFormat(schema), effort: "low" },
    messages: [{ role: "user", content: input }],
  }, { timeout: AGENT_TIMEOUT_MS });
  if (res.stop_reason === "refusal") throw new Error(`refused: ${res.stop_details?.category}`);
  return res.parsed_output;
}

// No API key: run the step through Claude Code headless, which uses the local Claude login.
async function viaCli(schema: z.ZodType, system: string, input: string) {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema);
  const proc = Bun.spawn(
    ["claude", "-p", "--model", MODEL, "--tools", "", "--output-format", "json",
      "--system-prompt", system, "--json-schema", JSON.stringify(jsonSchema)],
    { stdin: new Blob([input]), stdout: "pipe", stderr: "pipe" },
  );
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, AGENT_TIMEOUT_MS);
  try {
    const [out, err, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (timedOut) throw new Error(`claude timed out after ${AGENT_TIMEOUT_MS}ms`);
    if (exitCode !== 0) throw new Error(`claude exited ${exitCode}: ${err}`);
    const res = JSON.parse(out);
    if (res.is_error) throw new Error(`claude error: ${res.result}`);
    return res.structured_output;
  } finally {
    clearTimeout(timeout);
  }
}
