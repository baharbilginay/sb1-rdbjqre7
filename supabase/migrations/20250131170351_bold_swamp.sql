-- Create pending orders table
CREATE TABLE IF NOT EXISTS pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  symbol text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price > 0),
  type text NOT NULL CHECK (type IN ('buy', 'sell')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_orders
CREATE POLICY "Users can view own pending orders"
  ON pending_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pending orders"
  ON pending_orders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_pending_orders_user_id ON pending_orders(user_id);
CREATE INDEX idx_pending_orders_symbol ON pending_orders(symbol);
CREATE INDEX idx_pending_orders_status ON pending_orders(status);
CREATE INDEX idx_pending_orders_created_at ON pending_orders(created_at);

-- Add trigger for updating timestamps
CREATE TRIGGER update_pending_orders_updated_at
    BEFORE UPDATE ON pending_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to process pending orders
CREATE OR REPLACE FUNCTION process_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_rec RECORD;
BEGIN
  -- Get all pending orders
  FOR order_rec IN
    SELECT * FROM pending_orders 
    WHERE status = 'pending'
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Update order status to processing
      UPDATE pending_orders 
      SET status = 'processing'
      WHERE id = order_rec.id;

      -- Execute the trade
      PERFORM execute_trade(
        order_rec.symbol,
        CASE WHEN order_rec.type = 'buy' THEN order_rec.quantity ELSE -order_rec.quantity END,
        order_rec.price
      );

      -- Mark order as completed
      UPDATE pending_orders 
      SET status = 'completed',
          updated_at = now()
      WHERE id = order_rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next order
      RAISE NOTICE 'Error processing order %: %', order_rec.id, SQLERRM;
      
      -- Mark order as failed
      UPDATE pending_orders 
      SET status = 'cancelled',
          updated_at = now()
      WHERE id = order_rec.id;
    END;
  END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON pending_orders TO authenticated;