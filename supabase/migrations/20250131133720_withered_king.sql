-- Create automated stocks table
CREATE TABLE IF NOT EXISTS automated_stocks (
  symbol text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE automated_stocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for automated_stocks
CREATE POLICY "Public can view automated stocks"
  ON automated_stocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage automated stocks"
  ON automated_stocks FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_automated_stocks_symbol ON automated_stocks(symbol);

-- Add foreign key relationship to stock_prices
ALTER TABLE stock_prices
DROP CONSTRAINT IF EXISTS stock_prices_symbol_fkey,
ADD CONSTRAINT stock_prices_symbol_fkey 
  FOREIGN KEY (symbol) 
  REFERENCES watched_stocks(symbol) 
  ON DELETE CASCADE;

-- Add trigger for updating timestamps
CREATE TRIGGER update_automated_stocks_updated_at
    BEFORE UPDATE ON automated_stocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON automated_stocks TO authenticated;