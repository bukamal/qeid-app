-- Phase 5.4 Complete Double Entry Posting
-- Adds validation helpers for double-entry posting.
-- Review account mapping before enabling production posting.

create or replace function validate_journal_balance(p_entry_id bigint)
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

  if v_debit <> v_credit then
    raise exception 'Unbalanced journal entry: debit %, credit %', v_debit, v_credit;
  end if;

  return true;
end;
$$;
