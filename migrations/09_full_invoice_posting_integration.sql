-- Phase 5.6 - Full Invoice Posting Integration
-- This migration adds validation hooks for invoice posting.
-- Final account posting should be wired after confirming production account mapping.

create or replace function validate_invoice_journal_balance(p_entry_id bigint)
returns boolean
language plpgsql
as $$
declare
  v_debit numeric;
  v_credit numeric;
begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0)
  into v_debit, v_credit
  from journal_lines
  where entry_id = p_entry_id;

  return v_debit = v_credit;
end;
$$;
