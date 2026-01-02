-- DEPRECATED: merged into 000_final_schema.sql
-- Create admin_notes table for internal notes on orders/users
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure at least one of order_id or user_id is set
  CHECK ((order_id IS NOT NULL) OR (user_id IS NOT NULL))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_notes_order_id ON admin_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON admin_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON admin_notes(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_admin_notes_updated_at
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON admin_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);




