-- Create function to update automated stock prices
CREATE OR REPLACE FUNCTION update_automated_stock_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stock_rec RECORD;
  base_price numeric;
  new_price numeric;
  change_pct numeric;
  new_volume numeric;
BEGIN
  -- Only process during market hours
  IF NOT is_market_open() THEN
    RETURN;
  END IF;

  -- Update each automated stock
  FOR stock_rec IN
    SELECT s.symbol, sp.price as current_price
    FROM stocks s
    LEFT JOIN stock_prices sp ON s.symbol = sp.symbol
    WHERE s.is_automated = true AND s.is_active = true
  LOOP
    -- Get base price for the stock
    base_price := CASE stock_rec.symbol
      WHEN 'THYAO' THEN 256.40
      WHEN 'GARAN' THEN 48.72
      WHEN 'ASELS' THEN 84.15
      WHEN 'KCHOL' THEN 176.90
      WHEN 'SASA' THEN 342.50
      WHEN 'EREGL' THEN 52.85
      WHEN 'BIMAS' THEN 164.30
      WHEN 'AKBNK' THEN 44.92
      ELSE 100.0
    END;

    -- If current price is 0, use base price
    IF stock_rec.current_price = 0 THEN
      new_price := base_price;
    ELSE
      -- Generate random price movement (-2% to +2%)
      change_pct := random() * 4 - 2;
      new_price := stock_rec.current_price * (1 + change_pct / 100);
    END IF;

    -- Generate random volume
    new_volume := floor(random() * 900000 + 100000);

    -- Update stock price
    UPDATE stock_prices
    SET 
      price = round(new_price::numeric, 2),
      change_percentage = round(((new_price - stock_rec.current_price) / stock_rec.current_price * 100)::numeric, 2),
      volume = new_volume,
      updated_at = now()
    WHERE symbol = stock_rec.symbol;
  END LOOP;
END;
$$;

-- Create function to start price updater
CREATE OR REPLACE FUNCTION start_price_updater()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if market is open
  IF NOT is_market_open() THEN
    RAISE EXCEPTION 'Market is closed';
  END IF;

  -- Update prices immediately
  PERFORM update_automated_stock_prices();
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_automated_stock_prices TO authenticated;
GRANT EXECUTE ON FUNCTION start_price_updater TO authenticated;