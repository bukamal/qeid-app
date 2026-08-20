-- Phase 5.7
-- Full invoice posting integration draft
-- Review on staging before production.

-- This migration replaces the previous create_invoice_full implementation
-- after adapting account mapping to the live accounts table.

create or replace function public.assert_journal_balanced(p_entry_id bigint)
returns void
language plpgsql
as $$
declare
 d numeric;
 c numeric;
begin
 select coalesce(sum(debit),0), coalesce(sum(credit),0)
 into d,c
 from journal_lines
 where entry_id=p_entry_id;

 if d <> c then
   raise exception 'Unbalanced journal entry % debit % credit %', p_entry_id,d,c;
 end if;
end;
$$;

-- Posting integration helper.
-- The final create_invoice_full replacement should call this helper after
-- invoice, stock and journal rows are created.
