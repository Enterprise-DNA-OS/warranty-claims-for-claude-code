-- SQL CHECK treats NULL as unknown, so paired evidence fields need explicit presence checks.
ALTER TABLE terms ADD CONSTRAINT terms_usage_pair_present CHECK
 ((usage_limit IS NULL AND usage_unit IS NULL) OR (usage_limit IS NOT NULL AND usage_unit IS NOT NULL AND length(trim(usage_unit))>0));
ALTER TABLE claim_items ADD CONSTRAINT item_usage_pair_present CHECK
 ((usage_value IS NULL AND usage_unit IS NULL) OR (usage_value IS NOT NULL AND usage_unit IS NOT NULL AND length(trim(usage_unit))>0));
ALTER TABLE recoveries ADD CONSTRAINT recovery_credit_reference_present CHECK
 (recovered_cents=0 OR (credit_ref IS NOT NULL AND length(trim(credit_ref))>0));
ALTER TABLE claims ADD CONSTRAINT safety_report_reference_present CHECK
 (safety_reported_on IS NULL OR (injury_awareness_on IS NOT NULL AND safety_report_ref IS NOT NULL AND length(trim(safety_report_ref))>0));
