-- First add XU100 to stocks if not exists
INSERT INTO stocks (symbol, full_name, description, is_active, is_automated)
VALUES (
  'XU100',
  'BIST 100 Endeksi',
  '<p>Borsa İstanbul''da işlem gören en yüksek piyasa değerine sahip 100 şirketin hisse senetlerinden oluşan endeks.</p>
   <p>BIST 100 Endeksi, Türkiye ekonomisinin ve Borsa İstanbul''un gösterge endeksidir.</p>',
  true,
  true
) ON CONFLICT (symbol) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  is_automated = EXCLUDED.is_automated;

-- Initialize stock price for XU100 if not exists
INSERT INTO stock_prices (symbol, price, change_percentage, volume, updated_at)
VALUES (
  'XU100',
  0,
  0,
  0,
  now()
) ON CONFLICT (symbol) DO NOTHING;

-- Create function to automatically add XU100 to watchlist for new users
CREATE OR REPLACE FUNCTION add_default_watchlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add XU100 to user's watchlist
  INSERT INTO watchlist (user_id, symbol)
  VALUES (NEW.id, 'XU100')
  ON CONFLICT (user_id, symbol) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to add XU100 to watchlist when new user is created
DROP TRIGGER IF EXISTS add_default_watchlist_trigger ON profiles;
CREATE TRIGGER add_default_watchlist_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_default_watchlist();

-- Add XU100 to existing users' watchlists
INSERT INTO watchlist (user_id, symbol)
SELECT id, 'XU100'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM watchlist w 
  WHERE w.user_id = profiles.id 
  AND w.symbol = 'XU100'
);