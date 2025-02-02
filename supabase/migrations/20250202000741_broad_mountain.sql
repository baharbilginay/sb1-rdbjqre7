-- Add foreign key relationship between portfolio_items and stocks
ALTER TABLE portfolio_items
DROP CONSTRAINT IF EXISTS portfolio_items_symbol_fkey;

ALTER TABLE portfolio_items
ADD CONSTRAINT portfolio_items_symbol_fkey 
FOREIGN KEY (symbol) 
REFERENCES stocks(symbol) 
ON DELETE RESTRICT;

-- Add index for better join performance
CREATE INDEX IF NOT EXISTS idx_portfolio_items_symbol 
ON portfolio_items(symbol);

-- Update usePortfolio query to use proper join syntax
COMMENT ON TABLE portfolio_items IS 'Portfolio items with stock references';