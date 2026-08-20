-- Phase 5.3 Posting integration foundation
-- Connects posted invoices with journal entries.
-- Apply after reviewing account mapping per tenant.

create or replace function public.create_invoice_journal_entry(
 p_invoice_id bigint,
 p_user_id bigint,
 p_sales_account_name text default 'المبيعات',
 p_inventory_account_name text default 'المخزون'
)
returns bigint
language plpgsql
security definer
as $$
declare
 v_entry_id bigint;
 v_total numeric;
 v_sales_account bigint;
 v_cash_or_customer bigint;
begin
 select total into v_total
 from public.invoices
 where id=p_invoice_id and user_id=p_user_id;

 if v_total is null then
   raise exception 'Invoice not found';
 end if;

 select id into v_sales_account
 from public.accounts
 where user_id=p_user_id and name=p_sales_account_name
 limit 1;

 if v_sales_account is null then
   raise exception 'Sales account not found';
 end if;

 insert into public.journal_entries(user_id, date, description, reference)
 values(p_user_id,current_date,'Invoice posting',p_invoice_id::text)
 returning id into v_entry_id;

 insert into public.journal_lines(journal_entry_id, account_id, debit, credit)
 values(v_entry_id, v_sales_account,0,v_total);

 perform public.assert_balanced_journal(v_entry_id);

 return v_entry_id;
end;
$$;
