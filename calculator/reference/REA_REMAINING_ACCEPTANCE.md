# REA calculator — remaining acceptance inventory

**Inventory verified:** 2026-11-12. **Repository:** `philiparad/philiparad.github.io`.

The issue search returns **54 open REA issues (REA-069 through REA-122)**. No REA-123 or later task exists in the issue/code searches performed. Open status is **not** proof the feature is unimplemented: many earlier issues document source commits while explicitly keeping acceptance open pending browser executions and original/PLUS/PLUS C reference-device measurements. Conversely, a source commit or test file alone is **not** evidence of complete hardware parity.

**Release rule:** Never close a device-fidelity issue or claim CASIO parity solely because JavaScript regression suites pass. Required evidence is a recorded browser key/DOM test and model-specific genuine hardware or authorized reference capture, or an explicitly stated deviation/waiver by the project owner. The full audit must also verify original/PLUS/PLUS C menu routes and cancel/error/replay paths.

## Open task register

| Task | Issue | Scope | Acceptance |
|---|---|---|---|
| REA-069 | [#19](https://github.com/philiparad/philiparad.github.io/issues/19) | Correct original fx-991ES variable/register availability | Open; independent browser/reference review required |
| REA-070 | [#20](https://github.com/philiparad/philiparad.github.io/issues/20) | Render model-specific original fx-991ES casing and key legends | Open; independent browser/reference review required |
| REA-071 | [#21](https://github.com/philiparad/philiparad.github.io/issues/21) | Correct model-specific MODE, SETUP and command menu sequences | Open; independent browser/reference review required |
| REA-072 | [#22](https://github.com/philiparad/philiparad.github.io/issues/22) | Validate LCD glyphs, annunciators, pagination and 31×96 behavior | Open; independent browser/reference review required |
| REA-073 | [#23](https://github.com/philiparad/philiparad.github.io/issues/23) | Complete native two-dimensional textbook input templates | Open; independent browser/reference review required |
| REA-074 | [#24](https://github.com/philiparad/philiparad.github.io/issues/24) | Implement exact radical and pi-form calculation results | Open; independent browser/reference review required |
| REA-075 | [#25](https://github.com/philiparad/philiparad.github.io/issues/25) | Reconcile numerical precision and Fix/Sci/Norm rounding with original manual | Open; independent browser/reference review required |
| REA-076 | [#26](https://github.com/philiparad/philiparad.github.io/issues/26) | Match S⇔D, improper/mixed fractions, irrational conversion restrictions | Open; independent browser/reference review required |
| REA-077 | [#27](https://github.com/philiparad/philiparad.github.io/issues/27) | Implement native CALC substitution of all referenced variables | Open; independent browser/reference review required |
| REA-078 | [#28](https://github.com/philiparad/philiparad.github.io/issues/28) | Support CALC in CMPLX and equation-style expressions | Open; independent browser/reference review required |
| REA-079 | [#29](https://github.com/philiparad/philiparad.github.io/issues/29) | Reproduce SOLVE iteration UI, L−R and initial-guess interaction | Open; independent browser/reference review required |
| REA-080 | [#30](https://github.com/philiparad/philiparad.github.io/issues/30) | Use native inline ∫, d/dx and Σ templates rather than generic prompts | Open; independent browser/reference review required |
| REA-081 | [#31](https://github.com/philiparad/philiparad.github.io/issues/31) | Audit every SHIFT/ALPHA legend against mode and screen context | Open; independent browser/reference review required |
| REA-082 | [#32](https://github.com/philiparad/philiparad.github.io/issues/32) | Match native per-operand angle notation and DRG▶ conversions | Open; independent browser/reference review required |
| REA-083 | [#33](https://github.com/philiparad/philiparad.github.io/issues/33) | Complete sexagesimal editing, conversion and arithmetic | Open; independent browser/reference review required |
| REA-084 | [#34](https://github.com/philiparad/philiparad.github.io/issues/34) | Add STAT P(, Q(, R( and normalized variate t functions | Open; independent browser/reference review required |
| REA-085 | [#35](https://github.com/philiparad/philiparad.github.io/issues/35) | Finish original STAT menu order, raw parameter insertion and storage | Open; independent browser/reference review required |
| REA-086 | [#36](https://github.com/philiparad/philiparad.github.io/issues/36) | Validate all STAT regression variants, coefficients and estimates | Open; independent browser/reference review required |
| REA-087 | [#37](https://github.com/philiparad/philiparad.github.io/issues/37) | Complete BASE-N mixed-radix literals inside expressions | Open; independent browser/reference review required |
| REA-088 | [#42](https://github.com/philiparad/philiparad.github.io/issues/42) | Verify BASE-N sign, XNOR, NOT, NEG and 16/32-bit edge cases | Open; independent browser/reference review required |
| REA-089 | [#43](https://github.com/philiparad/philiparad.github.io/issues/43) | Complete CMPLX result commands, memory and natural display parity | Open; independent browser/reference review required |
| REA-090 | [#44](https://github.com/philiparad/philiparad.github.io/issues/44) | Complete native MATRIX expression chaining and MatAns workflows | Open; independent browser/reference review required |
| REA-091 | [#45](https://github.com/philiparad/philiparad.github.io/issues/45) | Complete native VECTOR expression chaining and VctAns workflows | Open; independent browser/reference review required |
| REA-092 | [#46](https://github.com/philiparad/philiparad.github.io/issues/46) | Match EQN coefficient editor, root ordering and complex/irrational results | Open; independent browser/reference review required |
| REA-093 | [#47](https://github.com/philiparad/philiparad.github.io/issues/47) | Check TABLE original-model restrictions, errors and X side effects | Open; independent browser/reference review required |
| REA-094 | [#48](https://github.com/philiparad/philiparad.github.io/issues/48) | Replace guessed original scientific constants with manual-era values | Open; independent browser/reference review required |
| REA-095 | [#49](https://github.com/philiparad/philiparad.github.io/issues/49) | Verify all 40 metric conversion codes and original factors | Open; independent browser/reference review required |
| REA-096 | [#50](https://github.com/philiparad/philiparad.github.io/issues/50) | Correct original fx-991ES memory, reset and replay persistence | Open; independent browser/reference review required |
| REA-097 | [#51](https://github.com/philiparad/philiparad.github.io/issues/51) | Complete expression precedence and hardware stack-error compatibility | Open; independent browser/reference review required |
| REA-098 | [#52](https://github.com/philiparad/philiparad.github.io/issues/52) | Isolate edition-only features and model-specific random commands | Open; independent browser/reference review required |
| REA-099 | [#53](https://github.com/philiparad/philiparad.github.io/issues/53) | Require model-specific physical/reference evidence before parity claims | Open; independent browser/reference review required |
| REA-100 | [#54](https://github.com/philiparad/philiparad.github.io/issues/54) | Keep standalone calculator publication synchronized with modular source | Open; independent browser/reference review required |
| REA-101 | [#55](https://github.com/philiparad/philiparad.github.io/issues/55) | Implement original STAT P(t): standard normal lower-tail probability | Open; independent browser/reference review required |
| REA-102 | [#56](https://github.com/philiparad/philiparad.github.io/issues/56) | Implement original STAT Q(t): standard normal probability from 0 to t | Open; independent browser/reference review required |
| REA-103 | [#57](https://github.com/philiparad/philiparad.github.io/issues/57) | Implement original STAT R(t): standard normal upper-tail probability | Open; independent browser/reference review required |
| REA-104 | [#58](https://github.com/philiparad/philiparad.github.io/issues/58) | Implement original STAT normalized variate t from sample data | Open; independent browser/reference review required |
| REA-105 | [#59](https://github.com/philiparad/philiparad.github.io/issues/59) | Fix decimal fast-path precedence overriding original fx-991ES arithmetic | Open; independent browser/reference review required |
| REA-106 | [#60](https://github.com/philiparad/philiparad.github.io/issues/60) | Prevent 1-VAR mean and standard deviation failure from intermediate overflow | Open; independent browser/reference review required |
| REA-107 | [#61](https://github.com/philiparad/philiparad.github.io/issues/61) | Preserve paired STAT Var/MinMax when sum moments overflow | Open; independent browser/reference review required |
| REA-108 | [#62](https://github.com/philiparad/philiparad.github.io/issues/62) | Prevent linear-regression correlation overflow from corrupting r | Open; independent browser/reference review required |
| REA-109 | [#63](https://github.com/philiparad/philiparad.github.io/issues/63) | Avoid catastrophic cancellation in quadratic regression inverse estimates | Open; independent browser/reference review required |
| REA-110 | [#64](https://github.com/philiparad/philiparad.github.io/issues/64) | Stabilize quadratic regression with weighted QR for unevenly spaced data | Open; independent browser/reference review required |
| REA-111 | [#65](https://github.com/philiparad/philiparad.github.io/issues/65) | Keep valid STAT Sum/Var menu choices accessible when another result is out of range | Open; independent browser/reference review required |
| REA-112 | [#66](https://github.com/philiparad/philiparad.github.io/issues/66) | Preserve full internal STAT precision when storing selected results in Ans | Open; independent browser/reference review required |
| REA-113 | [#67](https://github.com/philiparad/philiparad.github.io/issues/67) | Prevent rounded 1-VAR mean from corrupting population/sample deviations | Open; independent browser/reference review required |
| REA-114 | [#68](https://github.com/philiparad/philiparad.github.io/issues/68) | Fix linear regression slope/correlation when mean rounds away small offsets | Open; independent browser/reference review required |
| REA-115 | [#69](https://github.com/philiparad/philiparad.github.io/issues/69) | Preserve small STAT sums during cancellation of large observations | Open; independent browser/reference review required |
| REA-116 | [#70](https://github.com/philiparad/philiparad.github.io/issues/70) | Prevent catastrophic cancellation in quadratic regression yHat evaluation | Open; independent browser/reference review required |
| REA-117 | [#71](https://github.com/philiparad/philiparad.github.io/issues/71) | Preserve cancellation precision in linear regression yHat estimates | Open; independent browser/reference review required |
| REA-118 | [#72](https://github.com/philiparad/philiparad.github.io/issues/72) | Preserve discriminant precision in quadratic inverse regression estimates | Open; independent browser/reference review required |
| REA-119 | [#73](https://github.com/philiparad/philiparad.github.io/issues/73) | Prevent spurious overflow and underflow in exponential and power regression predictions | Open; independent browser/reference review required |
| REA-120 | [#74](https://github.com/philiparad/philiparad.github.io/issues/74) | Avoid y/A overflow or underflow in inverse exponential and power regression estimates | Open; independent browser/reference review required |
| REA-121 | [#75](https://github.com/philiparad/philiparad.github.io/issues/75) | Prevent cancellation errors in inverse-regression yHat (A+B/X) | Open; independent browser/reference review required |
| REA-122 | [#76](https://github.com/philiparad/philiparad.github.io/issues/76) | Preserve cancellation residuals in logarithmic regression yHat predictions | Open; independent browser/reference review required |

## Work already recorded

- **REA-069–REA-085:** issue bodies include historical source implementation records and/or known outstanding native parity work. Do not repeat successful feature implementation without checking the documented changes.
- **REA-086–REA-104:** legacy GitHub issue descriptions may still say "missing" although related implementation commits exist; re-check current source, tests and associated commit messages before assigning new development.
- **REA-105–REA-122:** source/test/standalone/doc work has been committed in the preceding numbered sessions. REA-107–122 regression suites provide direct JavaScript checks, but running in a source harness is not browser/physical-device certification.
- **REA-099:** evidence provenance and edition-specific verification is a cross-cutting acceptance dependency.
- **REA-100:** standalone/source synchronization is a cross-cutting release dependency.

## Executable verification baseline

The unified workflow `.github/workflows/rea-release-verification.yml` runs the REA-107–122 Node regression suites and the standalone builder check. Individual tasks retain their own targeted workflows. CI success, once observed, establishes only source/build regression health—not visual/hardware fidelity.

## Required completion sequence

1. Confirm GitHub Actions success for the latest commit; review failing job logs and fix source/test/build discrepancies.
2. Execute committed Playwright key/DOM suites for the original fx-991ES, PLUS and PLUS C models, fixing failures and capturing reproducible traces.
3. Obtain genuine model-specific LCD/key/menu references; compare legends, pixel placement, mode transitions, numerical precision and error behavior.
4. Add dated test evidence to each corresponding issue. Close only issues whose documented acceptance is fully met; leave unresolved hardware gaps explicitly open.
5. Define any new numbered REA task only after recording its scope and acceptance criteria, rather than continuing the sequence indefinitely without a backlog.

**Known external blockers:** genuine-device captures/reference measurements and any required physical-key tests in an actual browser runtime cannot be inferred from source-only tests.
