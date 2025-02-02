/*
  # Fix Trading Issues

  1. Changes
    - Fix positive_price constraint issue
    - Add proper constraints for portfolio items
    - Update execute_trade function to handle price validation
    - Add proper error messages

  2. Security
    - Maintain RLS policies
    - Add additional validation checks
*/

-- Drop existing positive_price constraint if exists
ALTER TABLE portfolio_items
DROP CONSTRAINT IF EXISTS positive_price;

-- Add new constraints with better validation
ALTER TABLE portfolio_items
ADD CONSTRAINT valid_quantity CHECK (quantity >= 0),
ADD CONSTRAINT valid_price CHECK (average_price >= 0);

-- Update execute_trade function with better validation
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

  -- Calculate total amount
  v_total_amount := p_price * ABS(p_quantity);

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- For sell orders, check if user has enough stocks
  IF p_quantity < 0 THEN
    SELECT quantity INTO v_current_quantity
    FROM portfolio_items
    WHERE user_id = v_user_id AND symbol = p_symbol;

    IF v_current_quantity IS NULL OR v_current_quantity < ABS(p_quantity) THEN
      RAISE EXCEPTION 'Insufficient stock quantity: Available % units', COALESCE(v_current_quantity, 0);
    END IF;
  -- For buy orders, check if user has enough balance
  ELSIF v_current_balance < v_total_amount THEN
    RAISE EXCEPTION 'Insufficient balance: Available %', v_current_balance;
  END IF;

  -- Begin transaction
  BEGIN
    -- Update user's balance
    UPDATE profiles
    SET balance = balance - (CASE WHEN p_quantity > 0 THEN v_total_amount ELSE -v_total_amount END)
    WHERE id = v_user_id;

    -- Update or insert portfolio item
    INSERT INTO portfolio_items (user_id, symbol, quantity, average_price)
    VALUES (
      v_user_id,
      p_symbol,
      ABS(p_quantity),
      p_price
    )
    ON CONFLICT (user_id, symbol)
    DO UPDATE SET
      quantity = CASE
        WHEN p_quantity > 0 THEN portfolio_items.quantity + p_quantity
        ELSE portfolio_items.quantity - ABS(p_quantity)
      END,
      average_price = CASE
        WHEN p_quantity > 0 THEN
          (portfolio_items.quantity * portfolio_items.average_price + p_quantity * p_price) /
          (portfolio_items.quantity + p_quantity)
        ELSE portfolio_items.average_price
      END,
      updated_at = now()
    WHERE (portfolio_items.quantity + CASE
      WHEN p_quantity > 0 THEN p_quantity
      ELSE -ABS(p_quantity)
    END) >= 0;

    -- Remove portfolio item if quantity becomes 0
    DELETE FROM portfolio_items
    WHERE user_id = v_user_id
      AND symbol = p_symbol
      AND quantity <= 0;

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