/*
  # Fix Trading Validation and Portfolio Updates

  1. Changes
    - Fix portfolio item updates for buy/sell operations
    - Add better price validation
    - Improve error handling and messages
    - Fix average price calculation

  2. Security
    - Maintain existing RLS policies
    - Add additional validation checks
*/

-- Update execute_trade function with fixed validation and portfolio updates
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
  v_current_avg_price numeric;
  v_total_amount numeric;
  v_new_quantity numeric;
  v_new_avg_price numeric;
BEGIN
  -- Input validation
  IF p_price <= 0 THEN
    RAISE EXCEPTION 'Invalid price: Price must be greater than 0';
  END IF;

  IF p_quantity = 0 THEN
    RAISE EXCEPTION 'Invalid quantity: Quantity cannot be zero';
  END IF;

  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not logged in';
  END IF;

  -- Calculate total amount for the transaction
  v_total_amount := p_price * ABS(p_quantity);

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Get current portfolio position
  SELECT quantity, average_price 
  INTO v_current_quantity, v_current_avg_price
  FROM portfolio_items
  WHERE user_id = v_user_id AND symbol = p_symbol;

  -- Set defaults if no existing position
  v_current_quantity := COALESCE(v_current_quantity, 0);
  v_current_avg_price := COALESCE(v_current_avg_price, 0);

  -- Calculate new position
  IF p_quantity > 0 THEN
    -- Buy order
    IF v_current_balance < v_total_amount THEN
      RAISE EXCEPTION 'Insufficient balance: Available %', v_current_balance;
    END IF;

    v_new_quantity := v_current_quantity + p_quantity;
    -- Calculate weighted average price only for buys
    v_new_avg_price := (v_current_quantity * v_current_avg_price + p_quantity * p_price) / v_new_quantity;
  ELSE
    -- Sell order
    IF v_current_quantity < ABS(p_quantity) THEN
      RAISE EXCEPTION 'Insufficient stock quantity: Available % units', v_current_quantity;
    END IF;

    v_new_quantity := v_current_quantity - ABS(p_quantity);
    -- Keep the same average price for sells
    v_new_avg_price := CASE 
      WHEN v_new_quantity > 0 THEN v_current_avg_price
      ELSE 0
    END;
  END IF;

  -- Begin transaction
  BEGIN
    -- Update user's balance
    UPDATE profiles
    SET balance = balance + (
      CASE 
        WHEN p_quantity > 0 THEN -v_total_amount  -- Subtract for buys
        ELSE v_total_amount                       -- Add for sells
      END
    )
    WHERE id = v_user_id;

    -- Update portfolio
    IF v_new_quantity > 0 THEN
      -- Insert or update position
      INSERT INTO portfolio_items (
        user_id,
        symbol,
        quantity,
        average_price,
        updated_at
      ) VALUES (
        v_user_id,
        p_symbol,
        v_new_quantity,
        v_new_avg_price,
        now()
      )
      ON CONFLICT (user_id, symbol) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        average_price = EXCLUDED.average_price,
        updated_at = EXCLUDED.updated_at;
    ELSE
      -- Remove position if quantity is 0
      DELETE FROM portfolio_items
      WHERE user_id = v_user_id AND symbol = p_symbol;
    END IF;

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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$;