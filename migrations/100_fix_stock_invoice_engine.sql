-- Phase 100: stock synchronization for invoice engine
-- Adds inventory updates inside invoice creation flow.
-- Requires apply_purchase_to_item and apply_sale_to_item from 02_rpc_functions.sql.

CREATE OR REPLACE FUNCTION public.sync_invoice_stock(
    p_user_id bigint,
    p_type text,
    p_lines jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_line jsonb;
    v_qty numeric;
    v_cost numeric;
BEGIN
    FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_lines,'[]'::jsonb))
    LOOP
        v_qty := COALESCE((v_line->>'quantity_in_base')::numeric,
                          (v_line->>'quantity')::numeric);
        v_cost := COALESCE((v_line->>'unit_cost')::numeric,
                           (v_line->>'unit_price')::numeric);

        IF p_type = 'purchase' THEN
            PERFORM apply_purchase_to_item(
                (v_line->>'item_id')::bigint,
                p_user_id,
                v_qty,
                v_cost
            );
        ELSIF p_type = 'sale' THEN
            PERFORM apply_sale_to_item(
                (v_line->>'item_id')::bigint,
                p_user_id,
                v_qty
            );
        END IF;
    END LOOP;
END;
$$;
