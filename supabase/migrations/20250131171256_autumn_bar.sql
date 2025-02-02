-- Drop existing foreign key constraints
ALTER TABLE stock_prices
DROP CONSTRAINT IF EXISTS stock_prices_symbol_fkey;

ALTER TABLE portfolio_items 
DROP CONSTRAINT IF EXISTS portfolio_items_symbol_fkey;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view stock prices" ON stock_prices;
DROP POLICY IF EXISTS "Only admins can update stock prices" ON stock_prices;

-- Create stocks table
CREATE TABLE IF NOT EXISTS stocks (
  symbol text PRIMARY KEY,
  full_name text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migrate existing data
INSERT INTO stocks (symbol, full_name, is_active)
SELECT DISTINCT symbol, symbol || ' A.Ş.', true
FROM portfolio_items
ON CONFLICT (symbol) DO NOTHING;

-- Create stock prices table
CREATE TABLE IF NOT EXISTS stock_prices (
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

-- Create new RLS policies for stock_prices
CREATE POLICY "Anyone can view stock prices"
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
CREATE INDEX idx_stock_prices_updated_at ON stock_prices(updated_at);

-- Add triggers for updating timestamps
CREATE TRIGGER update_stocks_updated_at
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update portfolio_items to reference stocks table
ALTER TABLE portfolio_items
ADD CONSTRAINT portfolio_items_symbol_fkey 
FOREIGN KEY (symbol) 
REFERENCES stocks(symbol) 
ON DELETE RESTRICT;

-- Grant necessary permissions
GRANT ALL ON stocks TO authenticated;
GRANT ALL ON stock_prices TO authenticated;