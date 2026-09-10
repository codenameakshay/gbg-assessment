# Pipeline run

claude-cli · claude-opus-5 · 10 posts → 9 unique · 59s

| Check | Result |
|---|---|
| Duplicates resolved correctly | 10/10 |
| Published | 8 |
| Held for a human | 1 |
| **False attributions (published to the wrong branch)** | **0** |
| Sponsored posts caught | 1/1 |
| Verifier corrections | 2 |

| Post | Status | Branch | Held because |
|---|---|---|---|
| r01 | publish | C001-SS | - |
| r03 | publish | C001-GN | - |
| r04 | hold | - | clinic/branch not certain; allegation needs human review: Suspected ghost surgery (대리수술): the reviewer thinks the director who explained the procedure at the consultation was not the person who came in on the day of surgery; The reviewer asked to view the CCTV footage of the surgery and the clinic has not responded yet |
| r05 | publish | C004-SS | - |
| r06 | publish | C002-AP | - |
| r07 | publish | C003-GN | - |
| r08 | publish | C001-SS | - |
| r09 | publish | C002-AP | - |
| r10 | publish | C001-SS | - |

## Verifier corrections
- r08: translation_en calls the director 'he', but the original (원장님이 ... 해주신다고) never says the director's gender. Use gender-neutral wording.
- r09: price_krw is null, but the post says Onyu, where the procedure was done, quoted 600 (600만원 = 6,000,000 KRW). The extraction also sets price_channel to 'quote', which contradicts leaving the price null. price_krw should be 6000000.
