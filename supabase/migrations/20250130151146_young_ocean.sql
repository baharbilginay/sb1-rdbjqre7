-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can create alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can insert alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON price_alerts;

-- Create new RLS policies with proper user_id handling
CREATE POLICY "Users can view own alerts"
  ON price_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create alerts"
  ON price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = COALESCE(user_id, auth.uid()) AND
    EXISTS (
      SELECT 1 FROM stock_prices WHERE symbol = price_alerts.symbol
    )
  );

CREATE POLICY "Users can update own alerts"
  ON price_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM stock_prices WHERE symbol = price_alerts.symbol
    )
  );

CREATE POLICY "Users can delete own alerts"
  ON price_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to automatically set user_id
CREATE OR REPLACE FUNCTION set_price_alert_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set user_id automatically
DROP TRIGGER IF EXISTS set_price_alert_user_id ON price_alerts;
CREATE TRIGGER set_price_alert_user_id
  BEFORE INSERT ON price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION set_price_alert_user_id();

-- Grant necessary permissions
GRANT ALL ON price_alerts TO authenticated;