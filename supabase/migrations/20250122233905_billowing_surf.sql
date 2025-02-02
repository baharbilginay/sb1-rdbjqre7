/*
  # Add stock management tables

  1. New Tables
    - `watched_stocks`: List of stocks being watched
      - `symbol` (text, primary key): Stock symbol
      - `created_at` (timestamp): When the stock was added to watchlist
    - `stock_prices`: Current prices of watched stocks
      - `symbol` (text, primary key): Stock symbol
      - `price` (numeric): Current price
      - `change_percentage` (numeric): Price change percentage
      - `volume` (numeric): Trading volume
      - `updated_at` (timestamp): Last update time

  2. Security
    - Enable RLS on both tables
    - Add policies for admin access
*/

-- Watched stocks table
CREATE TABLE IF NOT EXISTS watched_stocks (
  symbol text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Stock prices table
CREATE TABLE IF NOT EXISTS stock_prices (
  symbol text PRIMARY KEY REFERENCES watched_stocks(symbol) ON DELETE CASCADE,
  price numeric NOT NULL CHECK (price >= 0),
  change_percentage numeric,
  volume numeric,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE watched_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for watched_stocks
CREATE POLICY "Public can view watched stocks"
  ON watched_stocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage watched stocks"
  ON watched_stocks FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- RLS policies for stock_prices
CREATE POLICY "Public can view stock prices"
  ON stock_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update stock prices"
  ON stock_prices FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));