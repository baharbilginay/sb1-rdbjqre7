-- Update stocks table to cascade deletes
ALTER TABLE stock_prices
DROP CONSTRAINT IF EXISTS stock_prices_symbol_fkey,
ADD CONSTRAINT stock_prices_symbol_fkey 
  FOREIGN KEY (symbol) 
  REFERENCES stocks(symbol) 
  ON DELETE CASCADE;

-- Update portfolio_items to set null on stock deletion
ALTER TABLE portfolio_items
DROP CONSTRAINT IF EXISTS portfolio_items_symbol_fkey,
ADD CONSTRAINT portfolio_items_symbol_fkey 
  FOREIGN KEY (symbol) 
  REFERENCES stocks(symbol) 
  ON DELETE SET NULL;

-- Update pending_orders to set null on stock deletion
ALTER TABLE pending_orders
DROP CONSTRAINT IF EXISTS pending_orders_symbol_fkey,
ADD CONSTRAINT pending_orders_symbol_fkey 
  FOREIGN KEY (symbol) 
  REFERENCES stocks(symbol) 
  ON DELETE SET NULL;

-- Update price_alerts to cascade on stock deletion
ALTER TABLE price_alerts
DROP CONSTRAINT IF EXISTS price_alerts_symbol_fkey,
ADD CONSTRAINT price_alerts_symbol_fkey 
  FOREIGN KEY (symbol) 
  REFERENCES stocks(symbol) 
  ON DELETE CASCADE;

-- Update watchlist to cascade on stock deletion
ALTER TABLE watchlist
DROP CONSTRAINT IF EXISTS watchlist_symbol_fkey,
ADD CONSTRAINT watchlist_symbol_fkey 
  FOREIGN KEY (symbol) 
  REFERENCES stocks(symbol) 
  ON DELETE CASCADE;

-- Create function to safely delete stock
CREATE OR REPLACE FUNCTION delete_stock(p_symbol text)
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

  -- Check if stock exists
  IF NOT EXISTS (
    SELECT 1 FROM stocks 
    WHERE symbol = p_symbol
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hisse bulunamadı'
    );
  END IF;

  -- Delete the stock (this will cascade to related tables)
  DELETE FROM stocks
  WHERE symbol = p_symbol;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'message', 'Hisse başarıyla silindi'
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
GRANT EXECUTE ON FUNCTION delete_stock TO authenticated;