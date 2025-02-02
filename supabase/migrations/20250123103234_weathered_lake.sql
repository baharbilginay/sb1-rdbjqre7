-- Add unique constraint to portfolio_items
ALTER TABLE portfolio_items
ADD CONSTRAINT portfolio_items_user_symbol_key UNIQUE (user_id, symbol);

-- Create trade_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    symbol text NOT NULL,
    quantity numeric NOT NULL CHECK (quantity > 0),
    price numeric NOT NULL CHECK (price > 0),
    type text NOT NULL CHECK (type IN ('buy', 'sell')),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on trade_history
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for trade_history
CREATE POLICY "Users can view own trade history"
    ON trade_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade history"
    ON trade_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trade_history_user_id ON trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_user_symbol ON portfolio_items(user_id, symbol);

-- Update execute_trade function to handle errors better
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

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

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

  -- Begin transaction
  BEGIN
    -- Update user's balance
    UPDATE profiles
    SET balance = balance - (CASE WHEN p_quantity > 0 THEN v_total_amount ELSE -v_total_amount END)
    WHERE id = v_user_id;

    -- Update or insert portfolio item
    INSERT INTO portfolio_items (user_id, symbol, quantity, average_price)
    VALUES (v_user_id, p_symbol, p_quantity, p_price)
    ON CONFLICT (user_id, symbol)
    DO UPDATE SET
      quantity = portfolio_items.quantity + EXCLUDED.quantity,
      average_price = CASE
        WHEN portfolio_items.quantity + EXCLUDED.quantity > 0 THEN
          (portfolio_items.quantity * portfolio_items.average_price + p_quantity * p_price) /
          (portfolio_items.quantity + p_quantity)
        ELSE 0
      END,
      updated_at = now();

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