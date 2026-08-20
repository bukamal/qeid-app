-- Phase fix: invoice payment + inventory sync
-- Apply after existing invoice RPCs.

create or replace function public.create_invoice_full(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
 v_invoice_id bigint;
 v_total numeric := coalesce((p_payload->>'total')::numeric,0);
 v_paid numeric := coalesce((p_payload->>'paid_amount')::numeric,0);
 v_line jsonb;
 v_type text := p_payload->>'type';
begin

 insert into invoices(user_id,type,customer_id,supplier_id,date,reference,notes,total,status)
 values (
  (p_payload->>'user_id')::bigint,
  v_type,
  nullif(p_payload->>'customer_id','')::bigint,
  nullif(p_payload->>'supplier_id','')::bigint,
  coalesce((p_payload->>'date')::date,current_date),
  p_payload->>'reference',
  p_payload->>'notes',
  v_total,
  'posted'
 )
 returning id into v_invoice_id;

 for v_line in select * from jsonb_array_elements(coalesce(p_payload->'lines','[]'::jsonb))
 loop
  insert into invoice_lines(
    invoice_id,item_id,quantity,unit_price,total,unit_id,quantity_in_base,conversion_factor
  )
  values(
    v_invoice_id,
    nullif(v_line->>'item_id','')::bigint,
    (v_line->>'quantity')::numeric,
    (v_line->>'unit_price')::numeric,
    (v_line->>'total')::numeric,
    nullif(v_line->>'unit_id','')::bigint,
    coalesce((v_line->>'quantity_in_base')::numeric,(v_line->>'quantity')::numeric),
    coalesce((v_line->>'conversion_factor')::numeric,1)
  );
 end loop;

 if v_paid > 0 then
  insert into payments(
    user_id, invoice_id, customer_id, supplier_id, amount, payment_date, notes
  )
  values(
    (p_payload->>'user_id')::bigint,
    v_invoice_id,
    nullif(p_payload->>'customer_id','')::integer,
    nullif(p_payload->>'supplier_id','')::integer,
    v_paid,
    current_date,
    'Payment with invoice'
  );
 end if;

 return jsonb_build_object(
  'id',v_invoice_id,
  'status','posted',
  'paid_amount',v_paid
 );

exception when others then
 raise;
end;
$$;
