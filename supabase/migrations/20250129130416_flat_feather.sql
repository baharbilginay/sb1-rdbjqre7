-- Create custom_code table for storing custom HTML/CSS/JS
CREATE TABLE custom_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('html', 'css', 'js', 'chat')),
  name text NOT NULL,
  code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_code ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_code
CREATE POLICY "Only admins can manage custom code"
  ON custom_code FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add indexes
CREATE INDEX idx_custom_code_type ON custom_code(type);
CREATE INDEX idx_custom_code_is_active ON custom_code(is_active);

-- Add trigger for updating timestamps
CREATE TRIGGER update_custom_code_updated_at
    BEFORE UPDATE ON custom_code
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();