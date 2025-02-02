-- Create function to safely add watched stock
CREATE OR REPLACE FUNCTION add_watched_stock(p_symbol text)
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

  -- Delete existing records first
  DELETE FROM watched_stocks WHERE symbol = p_symbol;
  
  -- Wait for deletion to complete
  PERFORM pg_sleep(0.1);
  
  -- Add new stock
  INSERT INTO watched_stocks (symbol)
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
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bu hisse zaten takip listesinde'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;