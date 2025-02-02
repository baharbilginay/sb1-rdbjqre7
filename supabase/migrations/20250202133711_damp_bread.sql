-- Drop existing functions
DROP FUNCTION IF EXISTS get_initial_stock_price(text);
DROP FUNCTION IF EXISTS add_automated_stock(text);

-- Create improved add_automated_stock function
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