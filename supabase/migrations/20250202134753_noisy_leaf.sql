-- Drop existing functions
DROP FUNCTION IF EXISTS get_initial_stock_price(text);
DROP FUNCTION IF EXISTS add_automated_stock(text);

-- Create function to get initial stock price
CREATE OR REPLACE FUNCTION get_initial_stock_price(p_symbol text)
RETURNS numeric AS $$
DECLARE
  base_prices jsonb;
  base_price numeric;
BEGIN
  -- Define base prices for common stocks
  base_prices := '{
    "THYAO": 256.40,
    "GARAN": 48.72,
    "ASELS": 84.15,
    "KCHOL": 176.90,
    "SASA": 342.50,
    "EREGL": 52.85,
    "BIMAS": 164.30,
    "AKBNK": 44.92
  }'::jsonb;
  
  -- Get base price or use default
  base_price := (base_prices->>p_symbol)::numeric;
  RETURN COALESCE(base_price, 100.0);
END;
$$ LANGUAGE plpgsql;

-- Create improved add_automated_stock function
CREATE OR REPLACE FUNCTION add_automated_stock(p_symbol text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_price numeric;
  v_change_percentage numeric;
  v_volume numeric;
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

  -- Get initial price data
  v_base_price := get_initial_stock_price(p_symbol);
  v_change_percentage := random() * 4 - 2; -- Random between -2% and +2%
  v_volume := floor(random() * 900000 + 100000); -- Random volume between 100k and 1M

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
  
  -- Initialize price record with realistic data
  INSERT INTO stock_prices (
    symbol,
    price,
    change_percentage,
    volume,
    updated_at
  ) VALUES (
    p_symbol,
    v_base_price,
    v_change_percentage,
    v_volume,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'symbol', p_symbol,
      'price', v_base_price,
      'change_percentage', v_change_percentage
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
GRANT EXECUTE ON FUNCTION add_automated_stock TO authenticated;
GRANT EXECUTE ON FUNCTION get_initial_stock_price TO authenticated;