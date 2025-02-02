-- Drop custom_code related policies and constraints
DROP TABLE IF EXISTS custom_code CASCADE;

-- Update stocks table with additional fields
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS description text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stocks_full_name ON stocks(full_name) WHERE full_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocks_automated ON stocks(is_automated) WHERE is_automated = true;

-- Update add_automated_stock function with better validation
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

  -- Validate symbol format
  IF NOT p_symbol ~ '^[A-Z0-9]+$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Geçersiz hisse kodu formatı'
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION add_automated_stock TO authenticated;