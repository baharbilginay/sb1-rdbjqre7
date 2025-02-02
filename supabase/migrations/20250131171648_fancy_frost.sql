-- Drop existing tables to clean up the schema
DROP TABLE IF EXISTS automated_stock_prices CASCADE;
DROP TABLE IF EXISTS automated_stocks CASCADE;
DROP TABLE IF EXISTS stock_prices CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;

-- Create a single stocks table
CREATE TABLE stocks (
  symbol text PRIMARY KEY,
  full_name text,
  description text,
  is_active boolean DEFAULT true,
  is_automated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stock prices table
CREATE TABLE stock_prices (
  symbol text PRIMARY KEY REFERENCES stocks(symbol) ON DELETE CASCADE,
  price numeric NOT NULL CHECK (price >= 0),
  change_percentage numeric DEFAULT 0,
  volume numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for stocks
CREATE POLICY "Public can view active stocks"
  ON stocks FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage stocks"
  ON stocks FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- RLS policies for stock_prices
CREATE POLICY "Public can view stock prices"
  ON stock_prices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stocks 
      WHERE stocks.symbol = stock_prices.symbol 
      AND stocks.is_active = true
    )
  );

CREATE POLICY "Only admins can manage stock prices"
  ON stock_prices FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add indexes
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_is_active ON stocks(is_active);
CREATE INDEX idx_stocks_is_automated ON stocks(is_automated);
CREATE INDEX idx_stock_prices_updated_at ON stock_prices(updated_at);

-- Add triggers for updating timestamps
CREATE TRIGGER update_stocks_updated_at
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update add_automated_stock function
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
    SELECT 1 FROM stocks 
    WHERE symbol = p_symbol
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bu hisse zaten eklenmiş'
    );
  END IF;

  -- Add new stock
  INSERT INTO stocks (
    symbol,
    full_name,
    is_active,
    is_automated
  ) VALUES (
    p_symbol,
    p_symbol || ' A.Ş.',
    true,
    true
  );
  
  -- Initialize price record
  INSERT INTO stock_prices (
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

-- Grant necessary permissions
GRANT ALL ON stocks TO authenticated;
GRANT ALL ON stock_prices TO authenticated;