-- First ensure price_alerts table exists
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  symbol text REFERENCES stock_prices(symbol) NOT NULL,
  target_price numeric NOT NULL CHECK (target_price > 0),
  condition text NOT NULL CHECK (condition IN ('above', 'below')),
  is_triggered boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can manage own alerts" ON price_alerts;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own alerts"
  ON price_alerts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
  );

CREATE POLICY "Users can create own alerts"
  ON price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM stock_prices WHERE symbol = price_alerts.symbol
    )
  );

CREATE POLICY "Users can update own alerts"
  ON price_alerts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM stock_prices WHERE symbol = price_alerts.symbol
    )
  );

CREATE POLICY "Users can delete own alerts"
  ON price_alerts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_triggered ON price_alerts(is_triggered) WHERE NOT is_triggered;

-- Add trigger for updating timestamps
DROP TRIGGER IF EXISTS update_price_alerts_updated_at ON price_alerts;
CREATE TRIGGER update_price_alerts_updated_at
    BEFORE UPDATE ON price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON price_alerts TO authenticated;