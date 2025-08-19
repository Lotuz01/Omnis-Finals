ALTER TABLE accounts
ADD COLUMN payment_amount DECIMAL(10, 2) NULL,
ADD COLUMN payment_date DATE NULL;