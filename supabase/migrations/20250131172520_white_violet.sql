-- Drop existing tables to ensure clean state
DROP TABLE IF EXISTS automated_stock_prices CASCADE;
DROP TABLE IF EXISTS automated_stocks CASCADE;
DROP TABLE IF EXISTS stock_prices CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS pending_orders CASCADE;

-- Create stocks table
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

-- Create pending orders table
CREATE TABLE pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  symbol text REFERENCES stocks(symbol) NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price > 0),
  type text NOT NULL CHECK (type IN ('buy', 'sell')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

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

-- RLS policies for pending orders
CREATE POLICY "Users can view own pending orders"
  ON pending_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pending orders"
  ON pending_orders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_is_active ON stocks(is_active);
CREATE INDEX idx_stocks_is_automated ON stocks(is_automated);
CREATE INDEX idx_stock_prices_updated_at ON stock_prices(updated_at);
CREATE INDEX idx_pending_orders_user_id ON pending_orders(user_id);
CREATE INDEX idx_pending_orders_symbol ON pending_orders(symbol);
CREATE INDEX idx_pending_orders_status ON pending_orders(status);
CREATE INDEX idx_pending_orders_created_at ON pending_orders(created_at);

-- Add triggers for updating timestamps
CREATE TRIGGER update_stocks_updated_at
    BEFORE UPDATE ON stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_orders_updated_at
    BEFORE UPDATE ON pending_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some default stocks
INSERT INTO stocks (symbol, full_name, is_active, is_automated) VALUES
('THYAO', 'Türk Hava Yolları A.O.', true, true),
('GARAN', 'T. Garanti Bankası A.Ş.', true, true),
('ASELS', 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.', true, true),
('KCHOL', 'Koç Holding A.Ş.', true, true),
('SASA', 'SASA Polyester Sanayi A.Ş.', true, true),
('EREGL', 'Ereğli Demir ve Çelik Fabrikaları T.A.Ş.', true, true),
('BIMAS', 'BİM Birleşik Mağazalar A.Ş.', true, true),
('AKBNK', 'Akbank T.A.Ş.', true, true)
ON CONFLICT (symbol) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  is_automated = EXCLUDED.is_automated;

-- Initialize stock prices
INSERT INTO stock_prices (symbol, price, change_percentage, volume, updated_at)
SELECT 
  symbol,
  0,
  0,
  0,
  now()
FROM stocks
ON CONFLICT (symbol) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON stocks TO authenticated;
GRANT ALL ON stock_prices TO authenticated;
GRANT ALL ON pending_orders TO authenticated;