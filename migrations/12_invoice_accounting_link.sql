-- Phase 5.8 Accounting preparation
-- Adds invoice linkage to journal entries.
-- Review before production deployment.

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS invoice_id bigint;

CREATE INDEX IF NOT EXISTS idx_journal_entries_invoice_id
ON journal_entries(invoice_id);

CREATE OR REPLACE FUNCTION assert_journal_balanced(p_entry_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    d numeric;
    c numeric;
BEGIN
    SELECT COALESCE(SUM(debit),0),
           COALESCE(SUM(credit),0)
    INTO d,c
    FROM journal_lines
    WHERE entry_id = p_entry_id;

    IF d <> c THEN
        RAISE EXCEPTION 'Unbalanced journal entry %, debit %, credit %',
        p_entry_id, d, c;
    END IF;
END;
$$;
