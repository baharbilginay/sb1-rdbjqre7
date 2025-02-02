-- Create function to check if market is open
CREATE OR REPLACE FUNCTION is_market_open()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_time timestamptz;
  turkey_time timestamptz;
  weekday int;
  hour_minute int;
BEGIN
  -- Get current time in Turkey timezone
  now_time := now();
  turkey_time := now_time AT TIME ZONE 'Europe/Istanbul';
  
  -- Get weekday (1-7, where 1 is Monday)
  weekday := EXTRACT(DOW FROM turkey_time);
  
  -- Get hour and minute as a single number (e.g., 1015 for 10:15)
  hour_minute := EXTRACT(HOUR FROM turkey_time) * 100 + EXTRACT(MINUTE FROM turkey_time);
  
  -- Market hours: 09:55 - 18:15 Turkish time on weekdays (1-5)
  RETURN weekday BETWEEN 1 AND 5 
    AND hour_minute >= 955  -- 09:55
    AND hour_minute <= 1815;  -- 18:15
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_market_open TO authenticated;

-- Add index to improve performance of pending orders processing
CREATE INDEX IF NOT EXISTS idx_pending_orders_status_created 
ON pending_orders(status, created_at) 
WHERE status = 'pending';