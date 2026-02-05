import dbConnect from '../src/lib/mongodb';
import User from '../src/models/User';

async function checkMarketingUsers() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Finding marketing staff and mitra users...');
    const marketingUsers = await User.find({
      role: { $in: ['marketing', 'marketing_head', 'mitra'] }
    }).select('_id email fullName role customCommissionRate createdAt');

    console.log(`📋 Found ${marketingUsers.length} marketing staff and mitra user(s):\n`);

    if (marketingUsers.length === 0) {
      console.log('ℹ️  No marketing staff or mitra users found in the database.');
    } else {
      marketingUsers.forEach((user, index) => {
        const commissionRate = user.customCommissionRate !== undefined && user.customCommissionRate !== null
          ? `${(user.customCommissionRate * 100).toFixed(2)}%` 
          : 'not set (would use global rate)';
        console.log(`${index + 1}. ${user.fullName} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Commission Rate: ${commissionRate}`);
        console.log(`   Created: ${user.createdAt.toLocaleDateString()}\n`);
      });
    }

    console.log('✅ Check completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  checkMarketingUsers();
}