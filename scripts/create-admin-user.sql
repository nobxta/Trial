-- Script to create an admin user directly in the database
-- Replace the values below with your desired email, password hash, and role
-- 
-- To generate a password hash, you can use Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(h => console.log(h))"
--
-- Or use the TypeScript script: npx tsx scripts/create-admin-user.ts

-- Example: Create a super_admin user
-- Email: admin@mintmove.com
-- Password: admin123 (CHANGE THIS!)
-- Role: super_admin

INSERT INTO admin_users (email, password, role)
VALUES (
  'admin@mintmove.com',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;

-- To create via SQL with a known hash, first generate the hash using:
-- SELECT crypt('yourpassword', gen_salt('bf', 10));
-- Then use that hash in the INSERT above

