/*
  # Fix Trading Error Handling

  1. Changes
    - Add better validation for stock existence
    - Improve error messages
    - Add transaction isolation level
    - Add proper error codes
    - Fix balance calculation precision

  2. Security
    - Maintain RLS policies
    - Keep security definer
*/

-- Update execute_trade function with improved error handling
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
  v_stock_exists boolean;
BEGIN
  -- Set transaction isolation level
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

  -- Input validation with detailed error messages
  IF p_symbol IS NULL OR p_symbol = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hisse kodu geçersiz'
    );
  END IF;

  -- Check if stock exists
  SELECT EXISTS (
    SELECT 1 FROM stock_prices WHERE symbol = p_symbol
  ) INTO v_stock_exists;

  IF NOT v_stock_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Hisse senedi bulunamadı'
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

  -- Calculate total amount with proper precision
  v_total_amount := ROUND(p_price * ABS(p_quantity)::numeric, 2);

  -- Get current balance with error handling
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE; -- Lock the row to prevent concurrent updates

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kullanıcı profili bulunamadı'
    );
  END IF;

  -- Get current portfolio position with row lock
  SELECT quantity, average_price 
  INTO v_current_quantity, v_current_avg_price
  FROM portfolio_items
  WHERE user_id = v_user_id AND symbol = p_symbol
  FOR UPDATE;

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
    v_new_avg_price := ROUND(
      (v_current_quantity * v_current_avg_price + p_quantity * p_price) / v_new_quantity,
      2
    );
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
    -- Update balance with proper rounding
    UPDATE profiles
    SET balance = ROUND(balance + (
      CASE 
        WHEN p_quantity > 0 THEN -v_total_amount
        ELSE v_total_amount
      END
    )::numeric, 2)
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
        'new_balance', ROUND((v_current_balance + (CASE 
          WHEN p_quantity > 0 THEN -v_total_amount
          ELSE v_total_amount
        END))::numeric, 2),
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
          WHEN SQLSTATE = '40001' THEN 'Lütfen işlemi tekrar deneyiniz'
          WHEN SQLSTATE = '40P01' THEN 'Deadlock tespit edildi, lütfen tekrar deneyiniz'
          ELSE 'İşlem gerçekleştirilemedi: ' || SQLERRM
        END
      );
  END;
END;
$$;