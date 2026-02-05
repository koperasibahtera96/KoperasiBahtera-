import dbConnect from '../src/lib/mongodb';
import Settings from '../src/models/Settings';

async function initSystemSettings() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Checking if system settings exist...');
    let systemSettings = await Settings.findOne({ type: 'system' });

    if (systemSettings) {
      console.log('✅ System settings already exist');
      console.log(`📈 Current commission rate: ${systemSettings.config?.commissionRate ?? 'not set'} (${(systemSettings.config?.commissionRate * 100).toFixed(2)}%)`);
      console.log(`📅 Current minConsecutiveTenor: ${systemSettings.config?.minConsecutiveTenor ?? 'not set'}`);
    } else {
      console.log('❌ System settings not found. Creating with default values...');
      
      systemSettings = await Settings.create({
        type: 'system',
        config: {
          commissionRate: 0.02, // Default 2% commission rate
          minConsecutiveTenor: 10, // Default 10 consecutive tenors
          registrationFee: 50000, // Default registration fee
        },
        isActive: true
      });

      console.log('✅ System settings created successfully');
      console.log(`📈 Commission rate: ${systemSettings.config.commissionRate} (${(systemSettings.config.commissionRate * 100).toFixed(2)}%)`);
      console.log(`📅 MinConsecutiveTenor: ${systemSettings.config.minConsecutiveTenor}`);
      console.log(`💰 Registration fee: ${systemSettings.config.registrationFee}`);
    }

    console.log('\n✅ Initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initSystemSettings();
}