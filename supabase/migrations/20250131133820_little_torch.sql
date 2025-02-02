-- First drop existing foreign key constraint
ALTER TABLE stock_prices
DROP CONSTRAINT IF EXISTS stock_prices_symbol_fkey;

-- Create a function to validate stock symbol exists in either table
CREATE OR REPLACE FUNCTION validate_stock_symbol()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if symbol exists in either watched_stocks or automated_stocks
  IF EXISTS (
    SELECT 1 FROM watched_stocks WHERE symbol = NEW.symbol
    UNION
    SELECT 1 FROM automated_stocks WHERE symbol = NEW.symbol
  ) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Symbol must exist in either watched_stocks or automated_stocks';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate stock symbols
DROP TRIGGER IF EXISTS validate_stock_symbol ON stock_prices;
CREATE TRIGGER validate_stock_symbol
  BEFORE INSERT OR UPDATE ON stock_prices
  FOR EACH ROW
  EXECUTE FUNCTION validate_stock_symbol();

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

  -- Check if stock already exists in watched_stocks
  IF EXISTS (
    SELECT 1 FROM watched_stocks 
    WHERE symbol = p_symbol
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bu hisse manuel takip listesinde zaten mevcut'
    );
  END IF;

  -- Check if stock already exists in automated_stocks
  IF EXISTS (
    SELECT 1 FROM automated_stocks 
    WHERE symbol = p_symbol
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bu hisse otomatik takip listesinde zaten mevcut'
    );
  END IF;

  -- Add new stock
  INSERT INTO automated_stocks (symbol)
  VALUES (p_symbol);
  
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