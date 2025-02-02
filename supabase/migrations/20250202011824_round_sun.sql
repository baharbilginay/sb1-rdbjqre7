-- Drop existing watchlist table and recreate with proper structure
DROP TABLE IF EXISTS watchlist CASCADE;

CREATE TABLE watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol text REFERENCES stocks(symbol) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_stock UNIQUE (user_id, symbol)
);

-- Enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- RLS policies for watchlist
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own watchlist"
  ON watchlist FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM stocks 
      WHERE stocks.symbol = watchlist.symbol 
      AND stocks.is_active = true
    )
  );

CREATE POLICY "Users can delete from own watchlist"
  ON watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_symbol ON watchlist(symbol);
CREATE INDEX idx_watchlist_user_symbol ON watchlist(user_id, symbol);

-- Add trigger for updating timestamps
CREATE TRIGGER update_watchlist_updated_at
    BEFORE UPDATE ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON watchlist TO authenticated;

-- Add default stocks to watchlist for existing users
INSERT INTO watchlist (user_id, symbol)
SELECT DISTINCT p.id, s.symbol
FROM profiles p
CROSS JOIN (
  SELECT symbol FROM stocks 
  WHERE symbol IN ('XU100', 'THYAO', 'GARAN', 'ASELS')
  AND is_active = true
  LIMIT 1
) s
WHERE NOT EXISTS (
  SELECT 1 FROM watchlist w 
  WHERE w.user_id = p.id 
  AND w.symbol = s.symbol
);