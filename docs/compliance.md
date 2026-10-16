# Warranty record checks

Checked 16 October 2026. These checks find missing evidence and dates. They do not certify compliance or decide legal entitlement. The operator assesses jurisdiction, the transaction and the underlying facts. Contractual warranty administration is separate from consumer remedies. The system does not process payments or submit reports.

## CONSUMER-REVIEW

Sources: [New Zealand Consumer Protection: faulty and unsafe products](https://www.consumerprotection.govt.nz/general-help/common-consumer-issues/faulty-and-unsafe-products) and [ACCC: warranties](https://www.accc.gov.au/consumers/buying-products-and-services/warranties).

Consumer guarantees can continue after a manufacturer's warranty expires. Where an asset is marked consumer or unknown in NZ or AU, an outside-limit or incomplete contractual check flags a missing rights_review. Adjudication requires that review before a decision. The check does not decide whether the consumer law applies, whether a defect is major, what remedy is due or the reasonable life of a product. Business assets marked business are excluded from this automatic flag, but that label does not determine legal applicability. Review the classification before using it.

## AU-SAFETY-REPORT and AU-SAFETY-LATE

Source: [ACCC Product Safety: make a mandatory report](https://www.productsafety.gov.au/business/make-a-mandatory-report), including its linked mandatory reporting guideline.

The ACCC says suppliers must report a death, serious injury or serious illness associated with a supplied consumer good or product-related service within two days of awareness, subject to the applicable requirements and exceptions. The operator records the actual awareness date and jurisdiction. For AU records the software flags missing report evidence immediately and flags a recorded report later than awareness date plus two calendar days. This is a conservative calendar-date review aid, not an hour-level deadline calculation or a determination of reportability. NZ safety events remain visible on the claim but this AU rule does not calculate their reporting duties. A human handles the actual report through the relevant authority.

A recorded reference does not prove receipt by the regulator. The evidence should point to a retained submission receipt. Awareness cannot be moved later and the recorded jurisdiction cannot be changed through the CLI. Corrections need an audited review. Late reporting remains in the checks after closure; the system cannot undo it.

## Internal controls

These are business policies, not statutory deadlines:

- DECISION-EVIDENCE requires evidence, named reviewer, decision reason and date on decided claims.
- CLAIM-ITEMS flags claims with no linked asset and cost lines.
- CONTACT flags unresolved claims without contact for more than settings.stale_contact days, initially seven.
- RETURN and RECOVERY use the operator's due dates. There is no invented legal return period.
- Usage limits and dates come from the recorded contract. A passing check says only within recorded limits. It does not evaluate excluded faults, maintenance conditions or other contract wording.
- Adjudication refuses unknown usage where the recorded term requires it. It records the operator's decision and does not recommend rejection automatically.
- Closing requires an approved or rejected claim, complete record checks and all requested parts received. Outstanding supplier credits remain visible after claim closure.

Audit events retain before and after snapshots for CLI mutations. They are editable by the database owner and are not a tamper-proof ledger or authenticated signature system. Configure deployment access and retention for the business.
