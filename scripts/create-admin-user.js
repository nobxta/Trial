/**
 * Quick script to create an admin user
 * Run with: node scripts/create-admin-user.js
 * 
 * Make sure to install dependencies first:
 * npm install bcryptjs
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser(email, password, role = 'super_admin') {
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert admin user
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.error('❌ Admin user with this email already exists!');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
    process.exit(1);
  }

  return data;
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/create-admin-user.js <email> <password> [role]');
  console.log('Roles: viewer, operator, super_admin (default: super_admin)');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/create-admin-user.js admin@example.com password123 super_admin');
  process.exit(1);
}

const [email, password, role = 'super_admin'] = args;

if (!['viewer', 'operator', 'super_admin'].includes(role)) {
  console.error('❌ Invalid role. Must be: viewer, operator, or super_admin');
  process.exit(1);
}

createAdminUser(email, password, role)
  .then((admin) => {
    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log('');
    console.log('You can now sign in at: http://localhost:3000/sign-in');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  });

