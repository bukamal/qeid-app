-- Phase 5.1 invoice transaction RPC
-- Requires applying on a staging database first.

create or replace function public.create_invoice_full(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
 v_invoice_id bigint;
 v_total numeric := coalesce((p_payload->>'total')::numeric,0);
 v_line jsonb;
begin
 insert into invoices(user_id,type,customer_id,supplier_id,date,reference,notes,total,status)
 values (
  (p_payload->>'user_id')::bigint,
  p_payload->>'type',
  nullif(p_payload->>'customer_id','')::bigint,
  nullif(p_payload->>'supplier_id','')::bigint,
  coalesce((p_payload->>'date')::date,current_date),
  p_payload->>'reference',
  p_payload->>'notes',
  v_total,
  'posted'
 ) returning id into v_invoice_id;

 for v_line in select * from jsonb_array_elements(p_payload->'lines')
 loop
  insert into invoice_lines(invoice_id,item_id,quantity,unit_price,total,unit_id,quantity_in_base,conversion_factor)
  values(
   v_invoice_id,
   nullif(v_line->>'item_id','')::bigint,
   (v_line->>'quantity')::numeric,
   (v_line->>'unit_price')::numeric,
   (v_line->>'total')::numeric,
   nullif(v_line->>'unit_id','')::bigint,
   (v_line->>'quantity_in_base')::numeric,
   coalesce((v_line->>'conversion_factor')::numeric,1)
  );
 end loop;

 return jsonb_build_object('id',v_invoice_id,'status','posted');
exception when others then
 raise;
end;
$$;

create or replace function public.void_invoice_full(p_invoice_id bigint,p_user_id bigint)
returns jsonb
language plpgsql
security definer
as $$
begin
 update invoices set status='void'
 where id=p_invoice_id and user_id=p_user_id;
 return jsonb_build_object('id',p_invoice_id,'status','void');
end;
$$;
