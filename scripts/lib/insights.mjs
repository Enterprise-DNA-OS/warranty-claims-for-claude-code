export const insights = [
  [
    "Which open claims need both a consumer-rights review and a returned part?",
    `SELECT DISTINCT c.number,c.owner FROM claims c JOIN v_compliance x ON x.claim_id=c.id AND x.rule='CONSUMER-REVIEW' JOIN claim_items i ON i.claim_id=c.id JOIN part_returns r ON r.item_id=i.id WHERE c.status NOT IN ('closed','rejected') AND r.received_on IS NULL ORDER BY c.number`,
  ],
  [
    "Which product and fault combinations account for the largest claimed cost?",
    `SELECT * FROM v_failures ORDER BY currency,claimed_cents DESC,product`,
  ],
  [
    "Which serial numbers have repeat claims?",
    `SELECT a.serial,p.code AS product,count(DISTINCT i.claim_id) AS claims FROM assets a JOIN products p ON p.id=a.product_id JOIN claim_items i ON i.asset_id=a.id GROUP BY a.serial,p.code HAVING count(DISTINCT i.claim_id)>1 ORDER BY claims DESC,a.serial`,
  ],
  [
    "How much approved cost remains after supplier recoveries, by currency?",
    `SELECT currency,sum(approved_cents)::bigint AS approved_cents,sum(recovered_cents)::bigint AS recovered_cents,sum(approved_cents-recovered_cents)::bigint AS net_cents FROM v_claims WHERE approved_cents IS NOT NULL GROUP BY currency ORDER BY currency`,
  ],
  [
    "Which owners have the oldest unresolved claims?",
    `SELECT owner,count(*) AS open_claims,max(current_date-opened_on) AS oldest_days FROM claims WHERE status IN ('draft','submitted','review') GROUP BY owner ORDER BY oldest_days DESC,owner`,
  ],
  [
    "Which supplier balances are late despite a partial credit?",
    `SELECT name,number,supplier,currency,outstanding_cents,due_on FROM v_recoveries WHERE recovered_cents>0 AND outstanding_cents>0 AND due_on<current_date ORDER BY due_on,name`,
  ],
  [
    "Which claims have no evidence reference and no recent contact?",
    `SELECT number,owner,current_date-last_contact_on AS quiet_days FROM claims WHERE status IN ('submitted','review') AND NULLIF(trim(evidence_ref),'') IS NULL AND current_date-last_contact_on>(SELECT days FROM settings WHERE name='stale_contact') ORDER BY number`,
  ],
  [
    "Which contractual checks cannot finish because usage evidence is missing?",
    `SELECT number,serial,product,usage_value,usage_unit FROM v_coverage WHERE contractual_check='usage evidence needed' ORDER BY number,serial`,
  ],
  [
    "Which dealers supplied assets with repeat failure codes?",
    `SELECT p.name AS dealer,i.failure_code,count(*) AS occurrences FROM claim_items i JOIN assets a ON a.id=i.asset_id JOIN parties p ON p.id=a.dealer_id GROUP BY p.name,i.failure_code HAVING count(*)>1 ORDER BY occurrences DESC,dealer`,
  ],
  [
    "Which Australian serious-harm records still need reporting evidence?",
    `SELECT number,owner,injury_awareness_on,injury_awareness_on+2 AS review_deadline,safety_report_ref FROM claims WHERE safety_country='AU' AND injury_awareness_on IS NOT NULL AND (safety_reported_on IS NULL OR NULLIF(trim(safety_report_ref),'') IS NULL) ORDER BY injury_awareness_on,number`,
  ],
];
