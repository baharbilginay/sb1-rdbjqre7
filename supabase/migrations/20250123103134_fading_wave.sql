-- Hisse senedi alım-satım işlemleri için fonksiyon
CREATE OR REPLACE FUNCTION execute_trade(
  p_symbol text,
  p_quantity numeric,
  p_price numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance numeric;
  v_current_quantity numeric;
  v_total_amount numeric;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate total amount
  v_total_amount := p_price * p_quantity;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;

  -- For sell orders, check if user has enough stocks
  IF p_quantity < 0 THEN
    SELECT quantity INTO v_current_quantity
    FROM portfolio_items
    WHERE user_id = v_user_id AND symbol = p_symbol;

    IF v_current_quantity IS NULL OR v_current_quantity < ABS(p_quantity) THEN
      RAISE EXCEPTION 'Insufficient stock quantity';
    END IF;
  -- For buy orders, check if user has enough balance
  ELSIF v_current_balance < v_total_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Update user's balance
  UPDATE profiles
  SET balance = balance - v_total_amount
  WHERE id = v_user_id;

  -- Update portfolio
  INSERT INTO portfolio_items (user_id, symbol, quantity, average_price)
  VALUES (v_user_id, p_symbol, p_quantity, p_price)
  ON CONFLICT (user_id, symbol)
  DO UPDATE SET
    quantity = portfolio_items.quantity + EXCLUDED.quantity,
    average_price = CASE
      WHEN portfolio_items.quantity + EXCLUDED.quantity > 0 THEN
        (portfolio_items.quantity * portfolio_items.average_price + EXCLUDED.quantity * EXCLUDED.average_price) /
        (portfolio_items.quantity + EXCLUDED.quantity)
      ELSE 0
    END;

  -- Remove portfolio item if quantity becomes 0
  DELETE FROM portfolio_items
  WHERE user_id = v_user_id
    AND symbol = p_symbol
    AND quantity = 0;

  -- Record the transaction
  INSERT INTO trade_history (
    user_id,
    symbol,
    quantity,
    price,
    type
  ) VALUES (
    v_user_id,
    p_symbol,
    ABS(p_quantity),
    p_price,
    CASE WHEN p_quantity > 0 THEN 'buy' ELSE 'sell' END
  );

  RETURN true;
END;
$$;