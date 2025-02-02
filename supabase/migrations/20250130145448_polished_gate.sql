-- Add full_name column to watched_stocks
ALTER TABLE watched_stocks
ADD COLUMN IF NOT EXISTS full_name text;

-- Update existing stocks with example full names
UPDATE watched_stocks
SET full_name = CASE
  WHEN symbol = 'THYAO' THEN 'Türk Hava Yolları A.O.'
  WHEN symbol = 'GARAN' THEN 'T. Garanti Bankası A.Ş.'
  WHEN symbol = 'ASELS' THEN 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.'
  WHEN symbol = 'KCHOL' THEN 'Koç Holding A.Ş.'
  WHEN symbol = 'SASA' THEN 'SASA Polyester Sanayi A.Ş.'
  WHEN symbol = 'EREGL' THEN 'Ereğli Demir ve Çelik Fabrikaları T.A.Ş.'
  WHEN symbol = 'BIMAS' THEN 'BİM Birleşik Mağazalar A.Ş.'
  WHEN symbol = 'AKBNK' THEN 'Akbank T.A.Ş.'
  ELSE symbol || ' A.Ş.'
END
WHERE full_name IS NULL;