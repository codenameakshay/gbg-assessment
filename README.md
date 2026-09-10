# gbg-assessment

Review-syndication pipeline for Korean clinic reviews.

```bash
bun install
cp .env.example .env   # put your ANTHROPIC_API_KEY in .env (Bun loads it automatically)
bun run smoke          # one structured-extraction call on fixtures/reviews.jsonl
bun test               # clinic matcher + dedupe, checked against fixtures/labels.json
bun run typecheck
```

- `src/clinics.ts`: `resolve(text, clinics)` finds clinic/branch candidates from names, former names, romanised
  aliases and initials (ㅎㄴ, ㄱㄴ역). It is `confident` only when exactly one branch is named outright.
- `src/dedup.ts`: `dedupe(reviews)` maps each review to the earliest one it copies (char 3-gram containment ≥ 0.7).

## Pipeline

```bash
bun run pipeline       # uses ANTHROPIC_API_KEY if set, otherwise headless Claude Code (`claude -p`)
```

dedupe (code) → match clinic (code) → extract + translate (agent 1) → verify against the original (agent 2)
→ publish rules the models can't override (code) → report scored against hand labels.

- Latest live run: [out/report.md](out/report.md). Counts and per-record hold reasons are recorded there.
- Before the publication-gate audit: [out/pre-audit-report.md](out/pre-audit-report.md).
- First run, before the verifier handoff fix: [out/run1-report.md](out/run1-report.md).

## Fixtures

`fixtures/` holds 10 synthetic reviews, a 5-clinic registry and hand labels for evaluation.
All clinics, doctors and reviews in it are fictional.

## Publication gate

Every verifier finding or proposed correction requires human review, even when a corrected translation or price is available.
This conservative prototype does not automatically approve its own corrections. A later version can re-verify corrected records.
Detected allegations include agencies and intermediaries, not just clinics and doctors. Prices must be nonnegative integers.
The CLI has a two-minute deadline per call and drains both output streams concurrently.

`bun test` covers the publication gate with controlled agent responses: unresolved errors, proposed corrections, allegations,
invalid prices, candidate disagreement, initials, and provider failure. These tests do not call a live model.
The fixture run uses live models; its labels are only read by evaluation, never passed to either agent.
The receipt flag records fixture metadata, not independently verified evidence. Published records are local JSON, not a live service.
