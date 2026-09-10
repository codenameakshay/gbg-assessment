# Pipeline run

claude-cli · claude-opus-5 · 10 posts → 9 unique · 74s

| Check | Result |
|---|---|
| Duplicates resolved correctly | 10/10 |
| Published | 4 |
| Held for a human | 5 |
| **False attributions (published to the wrong branch)** | **0** |
| Sponsored posts caught | 1/1 |
| Verifier findings | 4 |

| Post | Status | Branch | Held because |
|---|---|---|---|
| r01 | publish | C001-SS | - |
| r03 | hold | C001-GN | verifier findings require human review: price_channel is 'unknown' but the post's disclosure states the clinic covered the procedure fee (시술비를 지원받아) — the channel is comped/sponsored, not unknown. |
| r04 | hold | - | clinic/branch not certain; allegation needs human review: Suspected ghost surgery: the director who explained the procedure at the consultation appeared to be a different person from the one who came in on the day of surgery; Clinic has not responded to the reviewer's request to view the CCTV footage |
| r05 | hold | C004-SS | verifier findings require human review: price_channel is set to "local" but the post says nothing about how/where the price was arranged or paid — unsupported inference (not repairable with the available correction fields). |
| r06 | publish | C002-AP | - |
| r07 | hold | C003-GN | verifier findings require human review: price_channel is set to "local" but the post gives no evidence of how the price was obtained (no mention of walk-in, event price, app coupon, or promotion); this is an unsupported inference.; Clinic name is romanized as "Misoraine Clinic" in the translation while the registry entry is "Misoline Clinic" (C003-GN); the transliteration should be aligned before publishing.; allegation needs human review: The director who performed the procedure is not a board-certified plastic surgeon, which the reviewer only found out afterwards |
| r08 | publish | C001-SS | - |
| r09 | publish | C002-AP | - |
| r10 | hold | C001-SS | allegation needs human review: The agency charged 1.6M KRW while locals paid 1.5M KRW for the same surgery, so the agency took a cut/markup; The agency's interpreter rushed the consultation; The reviewer never received the aftercare instruction sheet in English |

## Verifier findings
- r03: price_channel is 'unknown' but the post's disclosure states the clinic covered the procedure fee (시술비를 지원받아) — the channel is comped/sponsored, not unknown.
- r05: price_channel is set to "local" but the post says nothing about how/where the price was arranged or paid — unsupported inference (not repairable with the available correction fields).
- r07: price_channel is set to "local" but the post gives no evidence of how the price was obtained (no mention of walk-in, event price, app coupon, or promotion); this is an unsupported inference.
- r07: Clinic name is romanized as "Misoraine Clinic" in the translation while the registry entry is "Misoline Clinic" (C003-GN); the transliteration should be aligned before publishing.
