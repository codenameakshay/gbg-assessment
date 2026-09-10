# gbg-assessment

Review-syndication pipeline for Korean clinic reviews.

```bash
bun install
cp .env.example .env   # put your ANTHROPIC_API_KEY in .env (Bun loads it automatically)
bun run smoke          # one structured-extraction call on fixtures/reviews.jsonl
bun run typecheck
```

`fixtures/` holds 10 synthetic reviews, a 5-clinic registry and hand labels for evaluation.
All clinics, doctors and reviews in it are fictional.
