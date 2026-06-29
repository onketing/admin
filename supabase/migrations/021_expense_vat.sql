-- VAT field on expenses (income entries only; nullable)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vat bigint;
