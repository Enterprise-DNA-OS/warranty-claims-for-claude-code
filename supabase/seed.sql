INSERT INTO parties(id,name,role,country) VALUES
 ('10000000-0000-0000-0000-000000000001','Harbour Home Products','customer','NZ'),
 ('10000000-0000-0000-0000-000000000002','Harbour Home Products AU','customer','AU'),
 ('10000000-0000-0000-0000-000000000003','Kauri Distribution','dealer','NZ'),
 ('10000000-0000-0000-0000-000000000004','Southern Components','supplier','AU') ON CONFLICT DO NOTHING;
INSERT INTO products(id,code,name,supplier_id) VALUES
 ('20000000-0000-0000-0000-000000000001','PUMP-40','Home water pump','10000000-0000-0000-0000-000000000004'),
 ('20000000-0000-0000-0000-000000000002','DRY-20','Workshop dryer','10000000-0000-0000-0000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO assets(id,name,serial,product_id,customer_id,dealer_id,purchased_on,consumer_scope) VALUES
 ('30000000-0000-0000-0000-000000000001','Harbour pump one','HP-001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',current_date-800,'consumer'),
 ('30000000-0000-0000-0000-000000000002','Harbour pump two','HP-002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',current_date-300,'consumer'),
 ('30000000-0000-0000-0000-000000000003','Workshop dryer','DR-001','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',current_date-250,'business') ON CONFLICT DO NOTHING;
INSERT INTO terms(id,name,duration_months,usage_limit,usage_unit,description) VALUES
 ('40000000-0000-0000-0000-000000000001','Pump standard 24 months',24,NULL,NULL,'Recorded contractual window only; assess consumer rights separately'),
 ('40000000-0000-0000-0000-000000000002','Dryer 12 months or 1000 hours',12,1000,'hours','Both recorded limits apply') ON CONFLICT DO NOTHING;
INSERT INTO asset_warranties(id,name,asset_id,term_id,starts_on,ends_on) VALUES
 ('50000000-0000-0000-0000-000000000001','HP-001 standard','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',current_date-800,current_date-70),
 ('50000000-0000-0000-0000-000000000002','HP-002 standard','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',current_date-300,current_date+430),
 ('50000000-0000-0000-0000-000000000003','DR-001 standard','30000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000002',current_date-250,current_date+115) ON CONFLICT DO NOTHING;
INSERT INTO claims(id,number,name,opened_on,failure_on,status,owner,currency,evidence_ref,last_contact_on,injury_awareness_on,safety_country) VALUES
 ('60000000-0000-0000-0000-000000000001','WC-1001','Pump seal failed after warranty end',current_date-21,current_date-22,'review','Mere','NZD','inspection/HP-001',current_date-15,NULL,NULL),
 ('60000000-0000-0000-0000-000000000002','WC-1002','Pump electrical fault with serious injury reported',current_date-4,current_date-5,'submitted','Alex','AUD',NULL,current_date-4,current_date-3,'AU'),
 ('60000000-0000-0000-0000-000000000003','WC-1003','Dryer bearing seizure',current_date-16,current_date-17,'review','Mere','NZD','inspection/DR-001',current_date-10,NULL,NULL),
 ('60000000-0000-0000-0000-000000000004','WC-1004','Pump seal repair accepted',current_date-50,current_date-51,'approved','Alex','NZD','inspection/HP-001-previous',current_date-45,NULL,NULL) ON CONFLICT DO NOTHING;
UPDATE claims SET approved_cents=48000,rights_review='Operator recorded consumer remedy review',reviewer='Alex',decision_reason='Repair evidence accepted',decided_on=current_date-45 WHERE number='WC-1004' AND reviewer IS NULL;
INSERT INTO claim_items(id,name,claim_id,asset_id,failure_code,description,usage_value,usage_unit,parts_cents,labour_cents,other_cents) VALUES
 ('70000000-0000-0000-0000-000000000001','WC-1001 seal','60000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','SEAL','Seal leaking',NULL,NULL,18000,30000,4000),
 ('70000000-0000-0000-0000-000000000002','WC-1002 wiring','60000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','ELECTRICAL','Damaged cable; incident review needed',NULL,NULL,25000,40000,0),
 ('70000000-0000-0000-0000-000000000003','WC-1003 bearing','60000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','BEARING','Bearing seized',NULL,NULL,32000,18000,5000),
 ('70000000-0000-0000-0000-000000000004','WC-1004 seal','60000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001','SEAL','Earlier seal failure',NULL,NULL,18000,30000,0) ON CONFLICT DO NOTHING;
INSERT INTO part_returns(id,name,item_id,due_on,tracking_ref) VALUES ('80000000-0000-0000-0000-000000000001','RMA-101','70000000-0000-0000-0000-000000000001',current_date-7,'CARRIER-DEMO'),('80000000-0000-0000-0000-000000000002','RMA-102','70000000-0000-0000-0000-000000000003',current_date+3,NULL) ON CONFLICT DO NOTHING;
INSERT INTO recoveries(id,name,claim_id,supplier_id,requested_cents,recovered_cents,due_on,credit_ref) VALUES ('90000000-0000-0000-0000-000000000001','REC-101','60000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000004',18000,5000,current_date-10,'SUP-DEMO-01') ON CONFLICT DO NOTHING;
INSERT INTO notes(id,claim_id,name,body) VALUES ('a0000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Mere','Awaiting customer rights review and returned seal. All demo organisations and records are fictional.') ON CONFLICT DO NOTHING;
