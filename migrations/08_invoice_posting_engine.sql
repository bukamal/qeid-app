-- Phase 5.5 Automatic Invoice Posting foundation
-- Adds reusable validation helpers for future invoice posting RPC integration.

create or replace function public.validate_posting_balance(
  p_debit numeric,
  p_credit numeric
)
returns boolean
language plpgsql
as $$
begin
  return round(coalesce(p_debit,0),2) = round(coalesce(p_credit,0),2);
end;
$$;
