/**
 * Script to create an admin user
 * Run with: npx tsx scripts/create-admin-user.ts
 */

import { createAdminUser } from '../lib/db-admin';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: npx tsx scripts/create-admin-user.ts <email> <password> <role>');
    console.log('Roles: viewer, operator, super_admin');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/create-admin-user.ts admin@example.com password123 super_admin');
    process.exit(1);
  }

  const [email, password, role] = args;

  if (!['viewer', 'operator', 'super_admin'].includes(role)) {
    console.error('Invalid role. Must be: viewer, operator, or super_admin');
    process.exit(1);
  }

  try {
    console.log(`Creating admin user: ${email} with role: ${role}...`);
    const admin = await createAdminUser({
      email,
      password,
      role: role as 'viewer' | 'operator' | 'super_admin',
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log('');
    console.log('You can now sign in at: http://localhost:3000/sign-in');
  } catch (error: any) {
    console.error('❌ Failed to create admin user:', error.message);
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      console.error('   An admin user with this email already exists.');
    }
    process.exit(1);
  }
}

main();

