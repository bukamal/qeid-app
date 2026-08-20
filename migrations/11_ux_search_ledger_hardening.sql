
-- Phase 5.8 / UX search + ledger hardening

CREATE OR REPLACE FUNCTION assert_journal_balanced(p_entry_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
 v_debit numeric;
 v_credit numeric;
BEGIN
 SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
 INTO v_debit, v_credit
 FROM journal_lines
 WHERE entry_id=p_entry_id;

 IF v_debit <> v_credit THEN
   RAISE EXCEPTION 'Journal not balanced: debit %, credit %', v_debit, v_credit;
 END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_account_id(p_user_id uuid, p_name text)
RETURNS bigint
LANGUAGE sql
AS $$
 SELECT id FROM accounts
 WHERE user_id=p_user_id AND name=p_name
 LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION search_customers(p_user_id uuid, p_query text)
RETURNS TABLE(id bigint,name text,phone text)
LANGUAGE sql
AS $$
 SELECT id,name,phone FROM customers
 WHERE user_id=p_user_id AND name ILIKE '%'||p_query||'%'
 ORDER BY name LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION search_suppliers(p_user_id uuid, p_query text)
RETURNS TABLE(id bigint,name text,phone text)
LANGUAGE sql
AS $$
 SELECT id,name,phone FROM suppliers
 WHERE user_id=p_user_id AND name ILIKE '%'||p_query||'%'
 ORDER BY name LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION search_items(p_user_id uuid, p_query text)
RETURNS TABLE(id bigint,name text,barcode text)
LANGUAGE sql
AS $$
 SELECT id,name,barcode FROM items
 WHERE user_id=p_user_id
 AND (name ILIKE '%'||p_query||'%' OR barcode ILIKE '%'||p_query||'%')
 ORDER BY name LIMIT 30;
$$;

ALTER TABLE invoice_lines
DROP CONSTRAINT IF EXISTS invoice_lines_positive_values;

ALTER TABLE invoice_lines
ADD CONSTRAINT invoice_lines_positive_values
CHECK (quantity > 0 AND unit_price >= 0);
