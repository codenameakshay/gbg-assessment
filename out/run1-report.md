# Pipeline run

claude-cli · claude-opus-5 · 10 posts → 9 unique · 72s

| Check | Result |
|---|---|
| Duplicates resolved correctly | 10/10 |
| Published | 7 |
| Held for a human | 2 |
| **False attributions (published to the wrong branch)** | **0** |
| Sponsored posts caught | 1/1 |
| Verifier corrections | 2 |

| Post | Status | Branch | Held because |
|---|---|---|---|
| r01 | publish | C001-SS | - |
| r03 | publish | C001-GN | - |
| r04 | hold | - | clinic/branch not certain; allegation needs human review: Suspected ghost surgery (대리수술): the reviewer believes the director who did the consultation was not the person who came in on the day of surgery; The clinic has not answered the reviewer's request to view the CCTV footage of the operation |
| r05 | hold | C004-SS | verifier disagrees with matcher (abstained) |
| r06 | publish | C002-AP | - |
| r07 | publish | C003-GN | - |
| r08 | publish | C001-SS | - |
| r09 | publish | C002-AP | - |
| r10 | publish | C001-SS | - |

## Verifier corrections
- r08: translation_en adds a gender ('he') for the director (원장님); the original does not specify the doctor's gender
- r10: allegations is empty, but the post makes a pricing allegation against the agency: the reviewer paid 1.6M KRW through the agency, locals paid 1.5M KRW, and the reviewer says the agency 'clearly took a cut' (a 100,000 KRW markup). The post also complains about the agency's service: the interpreter rushed the consult and no English aftercare sheet was provided. These are allegations against the agency, not the clinic.
