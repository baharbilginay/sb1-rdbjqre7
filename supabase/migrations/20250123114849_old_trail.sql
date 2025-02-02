/*
  # Fix Trading Error Handling

  1. Changes
    - Add better error handling to execute_trade function
    - Add input validation
    - Add detailed error messages
    - Return structured error responses
*/

-- Update execute_trade function with better error handling
CREATE OR REPLACE FUNCTION execute_trade(
  p_symbol text,
  p_quantity numeric,
  p_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance numeric;
  v_current_quantity numeric;
  v_current_avg_price numeric;
  v_total_amount numeric;
  v_new_quantity numeric;
  v_new_avg_price numeric;
  v_result jsonb;
BEGIN
  -- Input validation with detailed error messages
  IF p_symbol IS NULL OR p_symbol = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hisse kodu geçersiz'
    );
  END IF;

  IF p_price <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fiyat 0''dan büyük olmalıdır'
    );
  END IF;

  IF p_quantity = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Miktar 0 olamaz'
    );
  END IF;

  -- Get current user ID with error handling
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Oturum açmanız gerekiyor'
    );
  END IF;

  -- Calculate total amount
  v_total_amount := p_price * ABS(p_quantity);

  -- Get current balance with error handling
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kullanıcı profili bulunamadı'
    );
  END IF;

  -- Get current portfolio position
  SELECT quantity, average_price 
  INTO v_current_quantity, v_current_avg_price
  FROM portfolio_items
  WHERE user_id = v_user_id AND symbol = p_symbol;

  -- Set defaults if no existing position
  v_current_quantity := COALESCE(v_current_quantity, 0);
  v_current_avg_price := COALESCE(v_current_avg_price, 0);

  -- Validate the trade
  IF p_quantity > 0 THEN
    -- Buy order
    IF v_current_balance < v_total_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Yetersiz bakiye. Mevcut bakiye: %s TL', round(v_current_balance::numeric, 2))
      );
    END IF;

    v_new_quantity := v_current_quantity + p_quantity;
    v_new_avg_price := (v_current_quantity * v_current_avg_price + p_quantity * p_price) / v_new_quantity;
  ELSE
    -- Sell order
    IF v_current_quantity < ABS(p_quantity) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Yetersiz hisse miktarı. Mevcut miktar: %s lot', v_current_quantity)
      );
    END IF;

    v_new_quantity := v_current_quantity - ABS(p_quantity);
    v_new_avg_price := CASE 
      WHEN v_new_quantity > 0 THEN v_current_avg_price
      ELSE 0
    END;
  END IF;

  -- Execute the trade within a transaction block
  BEGIN
    -- Update balance
    UPDATE profiles
    SET balance = balance + (
      CASE 
        WHEN p_quantity > 0 THEN -v_total_amount
        ELSE v_total_amount
      END
    )
    WHERE id = v_user_id;

    -- Update portfolio
    IF v_new_quantity > 0 THEN
      INSERT INTO portfolio_items (
        user_id,
        symbol,
        quantity,
        average_price,
        updated_at
      ) VALUES (
        v_user_id,
        p_symbol,
        v_new_quantity,
        v_new_avg_price,
        now()
      )
      ON CONFLICT (user_id, symbol) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        average_price = EXCLUDED.average_price,
        updated_at = EXCLUDED.updated_at;
    ELSE
      DELETE FROM portfolio_items
      WHERE user_id = v_user_id AND symbol = p_symbol;
    END IF;

    -- Record the transaction
    INSERT INTO trade_history (
      user_id,
      symbol,
      quantity,
      price,
      type
    ) VALUES (
      v_user_id,
      p_symbol,
      ABS(p_quantity),
      p_price,
      CASE WHEN p_quantity > 0 THEN 'buy' ELSE 'sell' END
    );

    -- Return success response with updated data
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'new_quantity', v_new_quantity,
        'new_balance', v_current_balance + (CASE 
          WHEN p_quantity > 0 THEN -v_total_amount
          ELSE v_total_amount
        END),
        'transaction_type', CASE WHEN p_quantity > 0 THEN 'buy' ELSE 'sell' END,
        'amount', v_total_amount
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Return detailed error information
      RETURN jsonb_build_object(
        'success', false,
        'error', CASE 
          WHEN SQLSTATE = '23503' THEN 'Geçersiz hisse kodu'
          WHEN SQLSTATE = '23514' THEN 'Geçersiz işlem değerleri'
          ELSE 'İşlem gerçekleştirilemedi: ' || SQLERRM
        END
      );
  END;
END;
$$;