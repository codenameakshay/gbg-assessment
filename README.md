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

`fixtures/` holds 10 synthetic reviews, a 5-clinic registry and hand labels for evaluation.
All clinics, doctors and reviews in it are fictional.
