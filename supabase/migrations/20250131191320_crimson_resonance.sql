-- Add logo_url column to stocks table
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS logo_url text;

-- Update RLS policies to include logo_url
DROP POLICY IF EXISTS "Public can view active stocks" ON stocks;
DROP POLICY IF EXISTS "Only admins can manage stocks" ON stocks;

CREATE POLICY "Public can view active stocks"
  ON stocks FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage stocks"
  ON stocks FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add index for logo_url
CREATE INDEX IF NOT EXISTS idx_stocks_logo_url ON stocks(logo_url) WHERE logo_url IS NOT NULL;