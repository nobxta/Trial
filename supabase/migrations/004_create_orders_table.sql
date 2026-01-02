-- DEPRECATED: merged into 000_final_schema.sql
-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  from_currency TEXT NOT NULL,
  from_amount DECIMAL(20, 8) NOT NULL,
  from_network TEXT,
  from_address TEXT,
  to_currency TEXT NOT NULL,
  to_amount DECIMAL(20, 8) NOT NULL,
  to_network TEXT,
  to_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);




