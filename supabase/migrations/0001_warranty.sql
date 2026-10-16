CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE parties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text UNIQUE, name text NOT NULL CHECK(length(trim(name))>0),
 role text NOT NULL CHECK(role IN ('customer','dealer','supplier')), country text NOT NULL CHECK(country IN ('NZ','AU','OTHER')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), raw_source jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text UNIQUE, code text UNIQUE NOT NULL, name text NOT NULL,
 supplier_id uuid REFERENCES parties(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), raw_source jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text UNIQUE, name text NOT NULL, serial text UNIQUE NOT NULL,
 product_id uuid NOT NULL REFERENCES products(id), customer_id uuid NOT NULL REFERENCES parties(id), dealer_id uuid REFERENCES parties(id),
 purchased_on date NOT NULL, consumer_scope text NOT NULL DEFAULT 'unknown' CHECK(consumer_scope IN ('consumer','business','unknown')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), raw_source jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE terms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text UNIQUE, name text NOT NULL, duration_months integer NOT NULL CHECK(duration_months>0),
 usage_limit numeric(14,2) CHECK(usage_limit>=0), usage_unit text, description text NOT NULL DEFAULT '',
 CHECK((usage_limit IS NULL AND usage_unit IS NULL) OR (usage_limit IS NOT NULL AND length(trim(usage_unit))>0)),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), raw_source jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE asset_warranties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text UNIQUE, name text NOT NULL, asset_id uuid NOT NULL REFERENCES assets(id), term_id uuid NOT NULL REFERENCES terms(id),
 starts_on date NOT NULL, ends_on date NOT NULL, CHECK(ends_on>=starts_on),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), raw_source jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text UNIQUE, number text UNIQUE NOT NULL, name text NOT NULL,
 opened_on date NOT NULL, failure_on date NOT NULL, status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('draft','submitted','review','approved','rejected','closed')),
 owner text NOT NULL, currency text NOT NULL CHECK(currency IN ('NZD','AUD','USD')), evidence_ref text,
 rights_review text, decision_reason text, reviewer text, approved_cents bigint CHECK(approved_cents>=0), decided_on date,
 last_contact_on date NOT NULL, injury_awareness_on date, safety_report_ref text, safety_reported_on date,
 safety_country text CHECK(safety_country IN ('NZ','AU','OTHER')), CHECK(failure_on<=opened_on), CHECK(last_contact_on>=opened_on),
 CHECK((injury_awareness_on IS NULL AND safety_country IS NULL) OR (injury_awareness_on IS NOT NULL AND safety_country IS NOT NULL)),
 CHECK(safety_reported_on IS NULL OR (injury_awareness_on IS NOT NULL AND safety_reported_on>=injury_awareness_on AND length(trim(safety_report_ref))>0)),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), raw_source jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE claim_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text UNIQUE, name text NOT NULL, claim_id uuid NOT NULL REFERENCES claims(id), asset_id uuid NOT NULL REFERENCES assets(id),
 failure_code text NOT NULL, description text NOT NULL, usage_value numeric(14,2) CHECK(usage_value>=0), usage_unit text,
 parts_cents bigint NOT NULL DEFAULT 0 CHECK(parts_cents>=0), labour_cents bigint NOT NULL DEFAULT 0 CHECK(labour_cents>=0), other_cents bigint NOT NULL DEFAULT 0 CHECK(other_cents>=0),
 CHECK((usage_value IS NULL AND usage_unit IS NULL) OR (usage_value IS NOT NULL AND length(trim(usage_unit))>0)),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), raw_source jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE part_returns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, item_id uuid NOT NULL REFERENCES claim_items(id), due_on date NOT NULL,
 received_on date, tracking_ref text, disposition text NOT NULL DEFAULT 'awaiting' CHECK(disposition IN ('awaiting','inspect','retain','released')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE recoveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, claim_id uuid NOT NULL REFERENCES claims(id), supplier_id uuid NOT NULL REFERENCES parties(id),
 requested_cents bigint NOT NULL CHECK(requested_cents>=0), recovered_cents bigint NOT NULL DEFAULT 0 CHECK(recovered_cents>=0 AND recovered_cents<=requested_cents),
 due_on date NOT NULL, credit_ref text, CHECK(recovered_cents=0 OR length(trim(credit_ref))>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), claim_id uuid NOT NULL REFERENCES claims(id), name text NOT NULL, body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text NOT NULL, record_id uuid NOT NULL, action text NOT NULL, actor text NOT NULL,
 before_record jsonb, after_record jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL, days integer NOT NULL CHECK(days>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO settings(name,days) VALUES ('stale_contact',7);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['parties','products','assets','terms','asset_warranties','claims','claim_items','part_returns','recoveries','notes','audit_events','settings'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM public',t);
END LOOP; END $$;
CREATE VIEW v_coverage AS
 SELECT i.id AS item_id,c.id AS claim_id,c.number,a.serial,p.code AS product,i.failure_code,c.failure_on,
 a.consumer_scope,cust.country,i.usage_value,i.usage_unit,
 CASE WHEN NOT EXISTS(SELECT 1 FROM asset_warranties w WHERE w.asset_id=a.id) THEN 'no warranty recorded'
 WHEN EXISTS(SELECT 1 FROM asset_warranties w JOIN terms t ON t.id=w.term_id WHERE w.asset_id=a.id AND c.failure_on BETWEEN w.starts_on AND w.ends_on
 AND (t.usage_limit IS NULL OR (i.usage_unit=t.usage_unit AND i.usage_value<=t.usage_limit))) THEN 'within recorded limits'
 WHEN EXISTS(SELECT 1 FROM asset_warranties w JOIN terms t ON t.id=w.term_id WHERE w.asset_id=a.id AND c.failure_on BETWEEN w.starts_on AND w.ends_on
 AND t.usage_limit IS NOT NULL AND (i.usage_value IS NULL OR i.usage_unit IS DISTINCT FROM t.usage_unit)) THEN 'usage evidence needed'
 ELSE 'outside recorded limits' END AS contractual_check,
 i.parts_cents+i.labour_cents+i.other_cents AS claimed_cents,c.currency
 FROM claim_items i JOIN claims c ON c.id=i.claim_id JOIN assets a ON a.id=i.asset_id JOIN products p ON p.id=a.product_id JOIN parties cust ON cust.id=a.customer_id;
CREATE VIEW v_claims AS
 SELECT c.id,c.number,c.name,c.status,c.owner,c.currency,c.opened_on,c.failure_on,c.last_contact_on,current_date-c.opened_on AS age_days,
 COALESCE((SELECT sum(i.parts_cents+i.labour_cents+i.other_cents) FROM claim_items i WHERE i.claim_id=c.id),0)::bigint AS claimed_cents,
 c.approved_cents,COALESCE((SELECT sum(r.recovered_cents) FROM recoveries r WHERE r.claim_id=c.id),0)::bigint AS recovered_cents,
 (SELECT count(*) FROM claim_items i WHERE i.claim_id=c.id) AS item_count,
 c.evidence_ref,c.rights_review,c.reviewer,c.decision_reason,c.decided_on
 FROM claims c;
CREATE VIEW v_recoveries AS SELECT r.id,r.name,c.number,p.name AS supplier,c.currency,r.requested_cents,r.recovered_cents,r.requested_cents-r.recovered_cents AS outstanding_cents,r.due_on,r.credit_ref,current_date-r.due_on AS overdue_days FROM recoveries r JOIN claims c ON c.id=r.claim_id JOIN parties p ON p.id=r.supplier_id;
CREATE VIEW v_returns AS SELECT r.id,r.name,c.number,a.serial,i.failure_code,r.due_on,r.received_on,r.tracking_ref,r.disposition,current_date-r.due_on AS overdue_days FROM part_returns r JOIN claim_items i ON i.id=r.item_id JOIN claims c ON c.id=i.claim_id JOIN assets a ON a.id=i.asset_id;
CREATE VIEW v_failures AS SELECT p.code AS product,i.failure_code,c.currency,count(*) AS item_count,count(DISTINCT i.asset_id) AS assets,sum(i.parts_cents+i.labour_cents+i.other_cents)::bigint AS claimed_cents FROM claim_items i JOIN assets a ON a.id=i.asset_id JOIN products p ON p.id=a.product_id JOIN claims c ON c.id=i.claim_id GROUP BY p.code,i.failure_code,c.currency;
CREATE VIEW v_compliance AS
 SELECT c.id AS claim_id,c.number,'CONSUMER-REVIEW'::text AS rule,'Consumer rights review missing; a warranty limit is not a legal decision'::text AS finding,
 CASE WHEN v.country='NZ' THEN 'https://www.consumerprotection.govt.nz/general-help/common-consumer-issues/faulty-and-unsafe-products' ELSE 'https://www.accc.gov.au/consumers/buying-products-and-services/warranties' END AS source
 FROM claims c JOIN v_coverage v ON v.claim_id=c.id WHERE v.country IN ('NZ','AU') AND v.consumer_scope IN ('consumer','unknown') AND NULLIF(trim(c.rights_review),'') IS NULL AND v.contractual_check<>'within recorded limits'
 UNION SELECT c.id,c.number,'AU-SAFETY-REPORT','Serious harm awareness recorded; report evidence missing. Review the two-day deadline immediately','https://www.productsafety.gov.au/business/make-a-mandatory-report' FROM claims c WHERE c.safety_country='AU' AND c.injury_awareness_on IS NOT NULL AND (NULLIF(trim(c.safety_report_ref),'') IS NULL OR c.safety_reported_on IS NULL)
 UNION SELECT c.id,c.number,'AU-SAFETY-LATE','Recorded safety report is later than awareness date plus two calendar days','https://www.productsafety.gov.au/business/make-a-mandatory-report' FROM claims c WHERE c.safety_country='AU' AND c.safety_reported_on>c.injury_awareness_on+2
 UNION SELECT c.id,c.number,'DECISION-EVIDENCE','Decision record needs reviewer, reason, date and evidence','docs/compliance.md#internal-controls' FROM claims c WHERE c.status IN ('approved','rejected','closed') AND (NULLIF(trim(c.reviewer),'') IS NULL OR NULLIF(trim(c.decision_reason),'') IS NULL OR c.decided_on IS NULL OR NULLIF(trim(c.evidence_ref),'') IS NULL)
 UNION SELECT c.id,c.number,'CLAIM-ITEMS','Claim has no linked assets or cost lines','docs/compliance.md#internal-controls' FROM claims c WHERE NOT EXISTS(SELECT 1 FROM claim_items i WHERE i.claim_id=c.id);
CREATE VIEW v_attention AS
 SELECT c.id AS claim_id,c.number,'CONTACT'::text AS reason,'No contact for '||(current_date-c.last_contact_on)||' days' AS detail,c.owner FROM claims c WHERE c.status IN ('draft','submitted','review') AND current_date-c.last_contact_on>(SELECT days FROM settings WHERE name='stale_contact')
 UNION SELECT c.id,c.number,'EVIDENCE','Evidence reference missing',c.owner FROM claims c WHERE c.status IN ('submitted','review') AND NULLIF(trim(c.evidence_ref),'') IS NULL
 UNION SELECT c.id,c.number,'RETURN',r.name||' overdue since '||r.due_on,c.owner FROM claims c JOIN claim_items i ON i.claim_id=c.id JOIN part_returns r ON r.item_id=i.id WHERE r.received_on IS NULL AND r.due_on<current_date
 UNION SELECT c.id,c.number,'RECOVERY',r.name||' supplier balance overdue',c.owner FROM claims c JOIN recoveries r ON r.claim_id=c.id WHERE r.recovered_cents<r.requested_cents AND r.due_on<current_date
 UNION SELECT c.id,c.number,v.rule,v.finding,c.owner FROM v_compliance v JOIN claims c ON c.id=v.claim_id;
REVOKE ALL ON v_coverage,v_claims,v_recoveries,v_returns,v_failures,v_compliance,v_attention FROM public;
