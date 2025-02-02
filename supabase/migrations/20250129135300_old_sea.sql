-- Add crypto columns to withdrawal_requests table
ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS crypto_address text,
ADD COLUMN IF NOT EXISTS crypto_network text;

-- Add check constraint for crypto network
ALTER TABLE withdrawal_requests
ADD CONSTRAINT valid_crypto_network 
CHECK (
  method != 'crypto' OR 
  (method = 'crypto' AND crypto_network IN ('USDT-TRC20'))
);

-- Add validation for crypto address when method is crypto
ALTER TABLE withdrawal_requests
ADD CONSTRAINT valid_crypto_address
CHECK (
  method != 'crypto' OR
  (method = 'crypto' AND crypto_address IS NOT NULL AND length(trim(crypto_address)) > 0)
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_crypto
ON withdrawal_requests(crypto_address) 
WHERE method = 'crypto';