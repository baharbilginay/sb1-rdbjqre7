-- Add description and image_url columns to watched_stocks
ALTER TABLE watched_stocks
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS image_url text;

-- Update RLS policies
DROP POLICY IF EXISTS "Public can view watched stocks" ON watched_stocks;
CREATE POLICY "Public can view watched stocks"
  ON watched_stocks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage watched stocks" ON watched_stocks;
CREATE POLICY "Only admins can manage watched stocks"
  ON watched_stocks FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));