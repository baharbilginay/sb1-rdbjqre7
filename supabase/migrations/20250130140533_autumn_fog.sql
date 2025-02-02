-- Create price alerts table
CREATE TABLE price_alerts (
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

-- RLS policies for price_alerts
CREATE POLICY "Users can manage own alerts"
  ON price_alerts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX idx_price_alerts_triggered ON price_alerts(is_triggered) WHERE NOT is_triggered;

-- Function to check and trigger price alerts
CREATE OR REPLACE FUNCTION check_price_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert RECORD;
  current_price numeric;
BEGIN
  FOR alert IN
    SELECT pa.*, sp.price 
    FROM price_alerts pa
    JOIN stock_prices sp ON pa.symbol = sp.symbol
    WHERE NOT pa.is_triggered
  LOOP
    current_price := alert.price;
    
    -- Check if alert condition is met
    IF (alert.condition = 'above' AND current_price >= alert.target_price) OR
       (alert.condition = 'below' AND current_price <= alert.target_price) THEN
      
      -- Mark alert as triggered
      UPDATE price_alerts
      SET is_triggered = true,
          updated_at = now()
      WHERE id = alert.id;
      
      -- Create notification
      INSERT INTO notifications (
        user_id,
        title,
        message,
        created_at
      ) VALUES (
        alert.user_id,
        CASE 
          WHEN alert.condition = 'above' THEN alert.symbol || ' yükseldi'
          ELSE alert.symbol || ' düştü'
        END,
        CASE 
          WHEN alert.condition = 'above' THEN 
            alert.symbol || ' hedef fiyat ' || alert.target_price || ' TL''ye ulaştı. Güncel fiyat: ' || current_price || ' TL'
          ELSE 
            alert.symbol || ' hedef fiyat ' || alert.target_price || ' TL''ye düştü. Güncel fiyat: ' || current_price || ' TL'
        END,
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- Create trigger to check alerts when prices update
CREATE OR REPLACE FUNCTION trigger_price_alert_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM check_price_alerts();
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_price_alerts_on_update
  AFTER UPDATE OF price ON stock_prices
  FOR EACH ROW
  EXECUTE FUNCTION trigger_price_alert_check();