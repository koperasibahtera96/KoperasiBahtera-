import dbConnect from '../src/lib/mongodb';
import User from '../src/models/User';
import Settings from '../src/models/Settings';

/**
 * Migration script to set default customCommissionRate for existing marketing staff
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Fetches global commission rate from Settings.config.commissionRate
 * 3. Updates all users with role 'marketing', 'marketing_head', or 'mitra' to have customCommissionRate set to the global rate
 * 4. Logs progress and results
 */

async function migrateMarketingCommission() {
  try {
    console.log('🚀 Starting migration: Set default customCommissionRate for marketing staff and mitra users...\n');

    // Step 1: Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // Step 2: Fetch global commission rate from Settings
    console.log('📊 Fetching global commission rate from Settings...');
    const settings = await Settings.findOne({ type: 'system' });

    if (!settings) {
      console.error('❌ Error: System settings not found');
      process.exit(1);
    }

    const globalCommissionRate = settings.config?.commissionRate;

    if (globalCommissionRate === undefined || globalCommissionRate === null) {
      console.warn('⚠️  Warning: Global commission rate not set in Settings. Using default value: 0.02 (2%)');
      const defaultRate = 0.02;
      console.log(`📈 Using commission rate: ${defaultRate} (${(defaultRate * 100).toFixed(2)}%)\n`);
      
      // Continue with default rate
      await updateMarketingUsers(defaultRate);
    } else {
      console.log(`📈 Global commission rate: ${globalCommissionRate} (${(globalCommissionRate * 100).toFixed(2)}%)\n`);
      
      // Step 3: Update all marketing staff
      await updateMarketingUsers(globalCommissionRate);
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

async function updateMarketingUsers(commissionRate: number) {
  // Step 3: Find all users with role 'marketing', 'marketing_head', or 'mitra'
  console.log('🔍 Finding marketing staff and mitra users...');
  const marketingUsers = await User.find({
    role: { $in: ['marketing', 'marketing_head', 'mitra'] }
  }).select('_id email fullName role customCommissionRate');

  console.log(`📋 Found ${marketingUsers.length} marketing staff and mitra user(s)\n`);

  if (marketingUsers.length === 0) {
    console.log('ℹ️  No marketing staff or mitra users found. Nothing to update.');
    return;
  }

  // Log users that will be updated
  console.log('📝 Users to be updated:');
  marketingUsers.forEach((user, index) => {
    const currentRate = user.customCommissionRate !== undefined 
      ? `${(user.customCommissionRate * 100).toFixed(2)}%` 
      : 'not set';
    console.log(`   ${index + 1}. ${user.fullName} (${user.email}) - Role: ${user.role} - Current rate: ${currentRate}`);
  });
  console.log('');

  // Step 4: Update users
  console.log('🔄 Updating users...');
  let updatedCount = 0;
  let skippedCount = 0;
  const updateResults: Array<{ email: string; status: string; reason?: string }> = [];

  for (const user of marketingUsers) {
    try {
      // Only update if customCommissionRate is not already set
      if (user.customCommissionRate === undefined || user.customCommissionRate === null) {
        await User.updateOne(
          { _id: user._id },
          { $set: { customCommissionRate: commissionRate } }
        );
        updatedCount++;
        updateResults.push({
          email: user.email,
          status: 'updated',
        });
        console.log(`   ✅ Updated: ${user.fullName} (${user.email}) - Set to ${(commissionRate * 100).toFixed(2)}%`);
      } else {
        skippedCount++;
        updateResults.push({
          email: user.email,
          status: 'skipped',
          reason: `Already has customCommissionRate: ${(user.customCommissionRate * 100).toFixed(2)}%`,
        });
        console.log(`   ⏭️  Skipped: ${user.fullName} (${user.email}) - Already has customCommissionRate: ${(user.customCommissionRate * 100).toFixed(2)}%`);
      }
    } catch (error: any) {
      updateResults.push({
        email: user.email,
        status: 'error',
        reason: error.message,
      });
      console.error(`   ❌ Error updating ${user.email}:`, error.message);
    }
  }

  // Step 5: Log results
  console.log('\n📊 Migration Summary:');
  console.log(`   Total marketing staff found: ${marketingUsers.length}`);
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors: ${updateResults.filter(r => r.status === 'error').length}`);

  // Verify the updates
  console.log('\n🔍 Verifying updates...');
  const updatedUsers = await User.find({
    role: { $in: ['marketing', 'marketing_head', 'mitra'] },
    customCommissionRate: commissionRate
  }).select('email fullName role customCommissionRate');

  console.log(`✅ Verified: ${updatedUsers.length} user(s) now have customCommissionRate set to ${(commissionRate * 100).toFixed(2)}%`);
}

// Run the migration
if (require.main === module) {
  migrateMarketingCommission();
}

export default migrateMarketingCommission;
