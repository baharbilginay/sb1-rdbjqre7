-- Add foreign key relationship between portfolio_items and stock_prices
ALTER TABLE portfolio_items
ADD CONSTRAINT portfolio_items_symbol_fkey
FOREIGN KEY (symbol)
REFERENCES stock_prices(symbol)
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_portfolio_items_symbol
ON portfolio_items(symbol);