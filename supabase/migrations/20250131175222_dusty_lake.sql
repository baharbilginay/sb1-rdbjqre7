-- Drop existing function if exists
DROP FUNCTION IF EXISTS create_pending_order;

-- Create improved function for order creation
CREATE OR REPLACE FUNCTION create_pending_order(
  p_symbol text,
  p_quantity numeric,
  p_price numeric,
  p_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance numeric;
  v_current_quantity numeric;
  v_total_amount numeric;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Oturum açmanız gerekiyor'
    );
  END IF;

  -- Validate input
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Miktar 0''dan büyük olmalıdır'
    );
  END IF;

  IF p_price <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fiyat 0''dan büyük olmalıdır'
    );
  END IF;

  IF p_type NOT IN ('buy', 'sell') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Geçersiz işlem türü'
    );
  END IF;

  -- Calculate total amount
  v_total_amount := p_quantity * p_price;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kullanıcı profili bulunamadı'
    );
  END IF;

  -- For buy orders, check balance
  IF p_type = 'buy' AND v_current_balance < v_total_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Yetersiz bakiye. Mevcut bakiye: %s TL', round(v_current_balance::numeric, 2))
    );
  END IF;

  -- For sell orders, check stock quantity
  IF p_type = 'sell' THEN
    SELECT quantity INTO v_current_quantity
    FROM portfolio_items
    WHERE user_id = v_user_id AND symbol = p_symbol;

    IF v_current_quantity IS NULL OR v_current_quantity < p_quantity THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Yetersiz hisse miktarı. Mevcut miktar: %s lot', COALESCE(v_current_quantity, 0))
      );
    END IF;
  END IF;

  -- Create pending order
  INSERT INTO pending_orders (
    user_id,
    symbol,
    quantity,
    price,
    type,
    status
  ) VALUES (
    v_user_id,
    p_symbol,
    p_quantity,
    p_price,
    p_type,
    'pending'
  );

  -- If market is open, process the order immediately
  IF is_market_open() THEN
    -- Execute trade
    DECLARE
      trade_result jsonb;
    BEGIN
      trade_result := execute_trade(
        p_symbol,
        CASE WHEN p_type = 'buy' THEN p_quantity ELSE -p_quantity END,
        p_price
      );

      IF (trade_result->>'success')::boolean THEN
        -- Update order status
        UPDATE pending_orders
        SET status = 'completed',
            updated_at = now()
        WHERE user_id = v_user_id
          AND symbol = p_symbol
          AND status = 'pending'
          AND created_at = (
            SELECT MAX(created_at)
            FROM pending_orders
            WHERE user_id = v_user_id
              AND symbol = p_symbol
              AND status = 'pending'
          );

        RETURN jsonb_build_object(
          'success', true,
          'data', jsonb_build_object(
            'message', 'İşlem başarıyla gerçekleştirildi',
            'order_status', 'completed'
          )
        );
      ELSE
        -- Update order status to cancelled
        UPDATE pending_orders
        SET status = 'cancelled',
            updated_at = now()
        WHERE user_id = v_user_id
          AND symbol = p_symbol
          AND status = 'pending'
          AND created_at = (
            SELECT MAX(created_at)
            FROM pending_orders
            WHERE user_id = v_user_id
              AND symbol = p_symbol
              AND status = 'pending'
          );

        RETURN jsonb_build_object(
          'success', false,
          'error', trade_result->>'error'
        );
      END IF;
    END;
  ELSE
    -- Market is closed, order will be processed later
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'message', 'Emir başarıyla kaydedildi',
        'order_status', 'pending'
      )
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log error details if needed
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_pending_order TO authenticated;