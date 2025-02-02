-- First drop existing triggers and functions
DROP TRIGGER IF EXISTS validate_stock_symbol ON stock_prices;
DROP FUNCTION IF EXISTS validate_stock_symbol();
DROP FUNCTION IF EXISTS add_automated_stock();

-- Create separate price tables for each system
CREATE TABLE IF NOT EXISTS automated_stock_prices (
  symbol text PRIMARY KEY REFERENCES automated_stocks(symbol) ON DELETE CASCADE,
  price numeric NOT NULL CHECK (price >= 0),
  change_percentage numeric,
  volume numeric,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE automated_stock_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for automated_stock_prices
CREATE POLICY "Public can view automated stock prices"
  ON automated_stock_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage automated stock prices"
  ON automated_stock_prices FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add function to safely add automated stock
CREATE OR REPLACE FUNCTION add_automated_stock(p_symbol text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check if admin
  IF NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;

  -- Check if stock already exists
  IF EXISTS (
    SELECT 1 FROM automated_stocks 
    WHERE symbol = p_symbol
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bu hisse zaten eklenmiş'
    );
  END IF;

  -- Add new stock
  INSERT INTO automated_stocks (symbol)
  VALUES (p_symbol);
  
  -- Initialize price record
  INSERT INTO automated_stock_prices (
    symbol,
    price,
    change_percentage,
    volume,
    updated_at
  ) VALUES (
    p_symbol,
    0,
    0,
    0,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'symbol', p_symbol
    )
  );

EXCEPTION 
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_automated_stock_prices_updated_at 
ON automated_stock_prices(updated_at);

-- Grant permissions
GRANT ALL ON automated_stock_prices TO authenticated;