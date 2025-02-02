-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS check_price_alerts_on_update ON stock_prices;
DROP FUNCTION IF EXISTS trigger_price_alert_check CASCADE;
DROP FUNCTION IF EXISTS check_price_alerts CASCADE;
DROP TRIGGER IF EXISTS set_price_alert_user_id ON price_alerts;
DROP FUNCTION IF EXISTS set_price_alert_user_id CASCADE;

-- Drop existing notifications policies first
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create new notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate price alerts table with proper constraints
DROP TABLE IF EXISTS price_alerts CASCADE;
CREATE TABLE price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol text NOT NULL REFERENCES stock_prices(symbol) ON DELETE CASCADE,
  target_price numeric NOT NULL CHECK (target_price > 0),
  condition text NOT NULL CHECK (condition IN ('above', 'below')),
  is_triggered boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for price alerts
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Create price alerts policies
CREATE POLICY "Users can view own alerts"
  ON price_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create alerts"
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

-- Function to check and trigger price alerts
CREATE OR REPLACE FUNCTION check_price_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notifications for triggered alerts
  INSERT INTO notifications (user_id, title, message)
  SELECT 
    pa.user_id,
    CASE 
      WHEN pa.condition = 'above' THEN pa.symbol || ' yükseldi'
      ELSE pa.symbol || ' düştü'
    END,
    CASE 
      WHEN pa.condition = 'above' THEN 
        pa.symbol || ' hedef fiyat ' || pa.target_price || ' TL''ye ulaştı. Güncel fiyat: ' || NEW.price || ' TL'
      ELSE 
        pa.symbol || ' hedef fiyat ' || pa.target_price || ' TL''ye düştü. Güncel fiyat: ' || NEW.price || ' TL'
    END
  FROM price_alerts pa
  WHERE pa.symbol = NEW.symbol
    AND NOT pa.is_triggered
    AND (
      (pa.condition = 'above' AND NEW.price >= pa.target_price) OR
      (pa.condition = 'below' AND NEW.price <= pa.target_price)
    );

  -- Mark alerts as triggered
  UPDATE price_alerts
  SET is_triggered = true,
      updated_at = now()
  WHERE symbol = NEW.symbol
    AND NOT is_triggered
    AND (
      (condition = 'above' AND NEW.price >= target_price) OR
      (condition = 'below' AND NEW.price <= target_price)
    );

  RETURN NEW;
END;
$$;

-- Create trigger on stock_prices
CREATE TRIGGER check_price_alerts_on_update
  AFTER UPDATE OF price ON stock_prices
  FOR EACH ROW
  EXECUTE FUNCTION check_price_alerts();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_triggered ON price_alerts(is_triggered) WHERE NOT is_triggered;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE NOT read;

-- Grant necessary permissions
GRANT ALL ON price_alerts TO authenticated;
GRANT ALL ON notifications TO authenticated;