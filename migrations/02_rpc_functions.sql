-- Function to refill tokens for rate limiting
CREATE OR REPLACE FUNCTION refill_tokens(p_bucket_key TEXT, p_max_tokens INT, p_refill_rate NUMERIC, p_window_seconds INT)
RETURNS NUMERIC AS $$
DECLARE
  v_tokens NUMERIC;
  v_last TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_elapsed_seconds NUMERIC;
  v_new_tokens NUMERIC;
BEGIN
  SELECT tokens, last_refill INTO v_tokens, v_last FROM rate_limits WHERE bucket_key = p_bucket_key FOR UPDATE;
  IF NOT FOUND THEN
    v_tokens := p_max_tokens;
    v_last := v_now;
  END IF;
  
  v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_last));
  v_new_tokens := LEAST(p_max_tokens, v_tokens + v_elapsed_seconds * p_refill_rate);
  
  INSERT INTO rate_limits (bucket_key, tokens, last_refill, updated_at)
  VALUES (p_bucket_key, v_new_tokens, v_now, v_now)
  ON CONFLICT (bucket_key) DO UPDATE SET
    tokens = EXCLUDED.tokens,
    last_refill = EXCLUDED.last_refill,
    updated_at = EXCLUDED.updated_at;
  
  RETURN v_new_tokens;
END;
$$ LANGUAGE plpgsql;

-- Function to consume a token (returns true if successful)
CREATE OR REPLACE FUNCTION consume_token(p_bucket_key TEXT, p_max_tokens INT, p_refill_rate NUMERIC, p_window_seconds INT)
RETURNS BOOLEAN AS $$
DECLARE
  v_tokens NUMERIC;
BEGIN
  v_tokens := refill_tokens(p_bucket_key, p_max_tokens, p_refill_rate, p_window_seconds);
  IF v_tokens >= 1 THEN
    UPDATE rate_limits SET tokens = tokens - 1, updated_at = NOW() WHERE bucket_key = p_bucket_key;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply purchase to item with row locking
CREATE OR REPLACE FUNCTION apply_purchase_to_item(
  p_item_id BIGINT,
  p_user_id BIGINT,
  p_qty_purchased NUMERIC,
  p_unit_cost NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_current_qty NUMERIC;
  v_current_avg NUMERIC;
  v_new_total_cost NUMERIC;
  v_new_avg NUMERIC;
BEGIN
  SELECT quantity, average_cost INTO v_current_qty, v_current_avg
  FROM items
  WHERE id = p_item_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or unauthorized';
  END IF;
  
  v_new_total_cost := (COALESCE(v_current_qty, 0) * COALESCE(v_current_avg, 0)) + (p_qty_purchased * p_unit_cost);
  v_new_avg := v_new_total_cost / (COALESCE(v_current_qty, 0) + p_qty_purchased);
  
  UPDATE items
  SET quantity = COALESCE(quantity, 0) + p_qty_purchased,
      average_cost = v_new_avg,
      updated_at = NOW()
  WHERE id = p_item_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Reverse purchase (for deletion) with row locking
CREATE OR REPLACE FUNCTION reverse_purchase_from_item(
  p_item_id BIGINT,
  p_user_id BIGINT,
  p_qty_purchased NUMERIC,
  p_unit_cost NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_current_qty NUMERIC;
  v_current_avg NUMERIC;
  v_new_total_cost NUMERIC;
  v_new_avg NUMERIC;
BEGIN
  SELECT quantity, average_cost INTO v_current_qty, v_current_avg
  FROM items
  WHERE id = p_item_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or unauthorized';
  END IF;
  
  v_new_total_cost := (COALESCE(v_current_qty, 0) * COALESCE(v_current_avg, 0)) - (p_qty_purchased * p_unit_cost);
  v_new_avg := CASE WHEN (COALESCE(v_current_qty, 0) - p_qty_purchased) > 0 
    THEN v_new_total_cost / (COALESCE(v_current_qty, 0) - p_qty_purchased)
    ELSE 0 END;
  
  UPDATE items
  SET quantity = COALESCE(quantity, 0) - p_qty_purchased,
      average_cost = v_new_avg,
      updated_at = NOW()
  WHERE id = p_item_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Apply sale to item (deduct quantity, return cost amount)
CREATE OR REPLACE FUNCTION apply_sale_to_item(
  p_item_id BIGINT,
  p_user_id BIGINT,
  p_qty_sold NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_current_qty NUMERIC;
  v_current_avg NUMERIC;
  v_cost_amount NUMERIC;
BEGIN
  SELECT quantity, average_cost INTO v_current_qty, v_current_avg
  FROM items
  WHERE id = p_item_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or unauthorized';
  END IF;
  
  IF COALESCE(v_current_qty, 0) < p_qty_sold THEN
    RAISE EXCEPTION 'Insufficient quantity';
  END IF;
  
  v_cost_amount := p_qty_sold * COALESCE(v_current_avg, 0);
  
  UPDATE items
  SET quantity = COALESCE(quantity, 0) - p_qty_sold,
      updated_at = NOW()
  WHERE id = p_item_id AND user_id = p_user_id;
  
  RETURN v_cost_amount;
END;
$$ LANGUAGE plpgsql;

-- Reverse sale (for deletion)
CREATE OR REPLACE FUNCTION reverse_sale_from_item(
  p_item_id BIGINT,
  p_user_id BIGINT,
  p_qty_sold NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE items
  SET quantity = COALESCE(quantity, 0) + p_qty_sold,
      updated_at = NOW()
  WHERE id = p_item_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Update customer balance (atomic)
CREATE OR REPLACE FUNCTION update_customer_balance(
  p_customer_id BIGINT,
  p_user_id BIGINT,
  p_change NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET balance = balance + p_change,
      updated_at = NOW()
  WHERE id = p_customer_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found or unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update supplier balance (atomic)
CREATE OR REPLACE FUNCTION update_supplier_balance(
  p_supplier_id BIGINT,
  p_user_id BIGINT,
  p_change NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE suppliers
  SET balance = balance + p_change,
      updated_at = NOW()
  WHERE id = p_supplier_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found or unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Full invoice update (complex atomic operation)
CREATE OR REPLACE FUNCTION update_invoice_full(
  p_invoice_id BIGINT,
  p_user_id BIGINT,
  p_new_type TEXT,
  p_customer_id BIGINT,
  p_supplier_id BIGINT,
  p_date DATE,
  p_reference TEXT,
  p_notes TEXT,
  p_new_lines JSONB,
  p_paid_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_old_invoice RECORD;
  v_old_line RECORD;
  v_new_line RECORD;
  v_total NUMERIC := 0;
  v_item RECORD;
  v_factor NUMERIC;
  v_base_qty NUMERIC;
  v_unit_cost NUMERIC;
  v_cost_amount NUMERIC;
BEGIN
  SELECT * INTO v_old_invoice FROM invoices WHERE id = p_invoice_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Reverse old effects
  FOR v_old_line IN SELECT * FROM invoice_lines WHERE invoice_id = p_invoice_id LOOP
    IF v_old_line.item_id IS NOT NULL THEN
      SELECT COALESCE(conversion_factor, 1) INTO v_factor FROM item_units WHERE item_id = v_old_line.item_id AND unit_id = v_old_line.unit_id;
      v_base_qty := v_old_line.quantity * COALESCE(v_factor, 1);
      
      IF v_old_invoice.type = 'purchase' THEN
        PERFORM reverse_purchase_from_item(v_old_line.item_id, p_user_id, v_base_qty, v_old_line.unit_cost);
      ELSE
        PERFORM reverse_sale_from_item(v_old_line.item_id, p_user_id, v_base_qty);
      END IF;
    END IF;
  END LOOP;

  -- Reverse payment effects
  PERFORM update_customer_balance(v_old_invoice.customer_id, p_user_id, -v_old_invoice.total);
  PERFORM update_supplier_balance(v_old_invoice.supplier_id, p_user_id, -v_old_invoice.total);

  DELETE FROM invoice_lines WHERE invoice_id = p_invoice_id;
  DELETE FROM payments WHERE invoice_id = p_invoice_id;

  -- Insert new lines and apply inventory effects
  FOR v_new_line IN SELECT * FROM jsonb_to_recordset(p_new_lines) AS x(item_id BIGINT, description TEXT, quantity NUMERIC, unit_price NUMERIC, total NUMERIC, unit_id BIGINT, quantity_in_base NUMERIC, unit_cost NUMERIC, cost_amount NUMERIC)
  LOOP
    v_total := v_total + v_new_line.total;
    
    INSERT INTO invoice_lines (invoice_id, item_id, description, quantity, unit_price, total, unit_id, quantity_in_base, unit_cost, cost_amount)
    VALUES (p_invoice_id, v_new_line.item_id, v_new_line.description, v_new_line.quantity, v_new_line.unit_price, v_new_line.total, v_new_line.unit_id, v_new_line.quantity_in_base, v_new_line.unit_cost, v_new_line.cost_amount);

    IF v_new_line.item_id IS NOT NULL THEN
      SELECT COALESCE(conversion_factor, 1) INTO v_factor FROM item_units WHERE item_id = v_new_line.item_id AND unit_id = v_new_line.unit_id;
      v_base_qty := v_new_line.quantity * COALESCE(v_factor, 1);
      
      IF p_new_type = 'purchase' THEN
        v_unit_cost := v_new_line.total / NULLIF(v_base_qty, 0);
        PERFORM apply_purchase_to_item(v_new_line.item_id, p_user_id, v_base_qty, v_unit_cost);
      ELSE
        v_cost_amount := apply_sale_to_item(v_new_line.item_id, p_user_id, v_base_qty);
        UPDATE invoice_lines SET cost_amount = v_cost_amount WHERE id = currval('invoice_lines_id_seq');
      END IF;
    END IF;
  END LOOP;

  UPDATE invoices
  SET type = p_new_type,
      customer_id = p_customer_id,
      supplier_id = p_supplier_id,
      date = p_date,
      reference = p_reference,
      notes = p_notes,
      total = v_total,
      updated_at = NOW()
  WHERE id = p_invoice_id;

  IF p_paid_amount > 0 THEN
    INSERT INTO payments (user_id, invoice_id, customer_id, supplier_id, amount, payment_date, notes)
    VALUES (p_user_id, p_invoice_id, p_customer_id, p_supplier_id, p_paid_amount, p_date, 'دفعة تلقائية من الفاتورة');
  END IF;

  IF p_new_type = 'sale' AND p_customer_id IS NOT NULL THEN
    PERFORM update_customer_balance(p_customer_id, p_user_id, v_total - p_paid_amount);
  ELSIF p_new_type = 'purchase' AND p_supplier_id IS NOT NULL THEN
    PERFORM update_supplier_balance(p_supplier_id, p_user_id, v_total - p_paid_amount);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create voucher full (atomic)
CREATE OR REPLACE FUNCTION create_voucher_full(
  p_user_id BIGINT,
  p_type TEXT,
  p_date DATE,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference TEXT,
  p_customer_id BIGINT,
  p_supplier_id BIGINT,
  p_invoice_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_voucher_id BIGINT;
  v_payment_id BIGINT;
BEGIN
  INSERT INTO vouchers (user_id, type, date, amount, description, reference, customer_id, supplier_id, invoice_id)
  VALUES (p_user_id, p_type, p_date, p_amount, p_description, p_reference, p_customer_id, p_supplier_id, p_invoice_id)
  RETURNING id INTO v_voucher_id;

  INSERT INTO payments (user_id, invoice_id, customer_id, supplier_id, amount, payment_date, notes, voucher_id)
  VALUES (p_user_id, p_invoice_id, p_customer_id, p_supplier_id, p_amount, p_date, p_description, v_voucher_id)
  RETURNING id INTO v_payment_id;

  IF p_type = 'receipt' AND p_customer_id IS NOT NULL THEN
    PERFORM update_customer_balance(p_customer_id, p_user_id, -p_amount);
  ELSIF p_type = 'payment' AND p_supplier_id IS NOT NULL THEN
    PERFORM update_supplier_balance(p_supplier_id, p_user_id, p_amount);
  END IF;

  RETURN jsonb_build_object('id', v_voucher_id, 'payment_id', v_payment_id);
END;
$$ LANGUAGE plpgsql;

-- Delete voucher full (atomic undo)
CREATE OR REPLACE FUNCTION delete_voucher_full(
  p_voucher_id BIGINT,
  p_user_id BIGINT
)
RETURNS VOID AS $$
DECLARE
  v_voucher RECORD;
BEGIN
  SELECT * INTO v_voucher FROM vouchers WHERE id = p_voucher_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found';
  END IF;

  IF v_voucher.type = 'receipt' AND v_voucher.customer_id IS NOT NULL THEN
    PERFORM update_customer_balance(v_voucher.customer_id, p_user_id, v_voucher.amount);
  ELSIF v_voucher.type = 'payment' AND v_voucher.supplier_id IS NOT NULL THEN
    PERFORM update_supplier_balance(v_voucher.supplier_id, p_user_id, -v_voucher.amount);
  END IF;

  DELETE FROM payments WHERE voucher_id = p_voucher_id;
  DELETE FROM vouchers WHERE id = p_voucher_id;
END;
$$ LANGUAGE plpgsql;
