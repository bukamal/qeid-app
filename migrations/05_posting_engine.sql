-- Phase 5.2 Posting Engine foundation
-- Adds validation helpers for double entry posting.
-- Review account mapping before enabling automatic posting in production.

create or replace function public.assert_balanced_journal(
  p_journal_entry_id bigint
)
returns boolean
language plpgsql
as $$
declare
  v_debit numeric;
  v_credit numeric;
begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0)
    into v_debit, v_credit
  from public.journal_lines
  where journal_entry_id = p_journal_entry_id;

  if v_debit <> v_credit then
    raise exception 'Unbalanced journal entry % debit %, credit %',
      p_journal_entry_id, v_debit, v_credit;
  end if;

  return true;
end;
$$;
