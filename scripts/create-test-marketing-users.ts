import dbConnect from '../src/lib/mongodb';
import User from '../src/models/User';

async function createTestMarketingUsers() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    const testUsers = [
      {
        email: 'marketing1@test.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        fullName: 'Marketing Staff 1',
        role: 'marketing',
        phone: '081234567890',
        isActive: true,
        phoneNumber: '+6281234567890',
        dateOfBirth: new Date('1990-01-01'),
        ktpAddress: 'Jl. Test KTP 123',
        ktpVillage: 'Kelurahan Test',
        ktpCity: 'Kota Test',
        ktpProvince: 'Provinsi Test',
        ktpPostalCode: '12345',
        domisiliAddress: 'Jl. Test Domisili 123',
        domisiliVillage: 'Kelurahan Test',
        domisiliCity: 'Kota Test',
        domisiliProvince: 'Provinsi Test',
        domisiliPostalCode: '12345',
        verificationStatus: 'approved',
        nik: '1234567890123456',
        beneficiaryName: 'Test Beneficiary',
        beneficiaryNik: '1234567890123457',
        beneficiaryDateOfBirth: new Date('1990-01-01'),
        beneficiaryRelationship: 'anak_kandung'
      },
      {
        email: 'marketinghead@test.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        fullName: 'Marketing Head',
        role: 'marketing_head',
        phone: '081234567891',
        isActive: true,
        phoneNumber: '+6281234567891',
        dateOfBirth: new Date('1985-05-15'),
        ktpAddress: 'Jl. Test KTP 124',
        ktpVillage: 'Kelurahan Test',
        ktpCity: 'Kota Test',
        ktpProvince: 'Provinsi Test',
        ktpPostalCode: '12345',
        domisiliAddress: 'Jl. Test Domisili 124',
        domisiliVillage: 'Kelurahan Test',
        domisiliCity: 'Kota Test',
        domisiliProvince: 'Provinsi Test',
        domisiliPostalCode: '12345',
        verificationStatus: 'approved',
        nik: '1234567890123458',
        beneficiaryName: 'Test Beneficiary 2',
        beneficiaryNik: '1234567890123459',
        beneficiaryDateOfBirth: new Date('1985-05-15'),
        beneficiaryRelationship: 'suami_istri'
      },
      {
        email: 'mitra1@test.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        fullName: 'Mitra Partner 1',
        role: 'mitra',
        phone: '081234567892',
        isActive: true,
        phoneNumber: '+6281234567892',
        dateOfBirth: new Date('1988-03-10'),
        ktpAddress: 'Jl. Test KTP 125',
        ktpVillage: 'Kelurahan Test',
        ktpCity: 'Kota Test',
        ktpProvince: 'Provinsi Test',
        ktpPostalCode: '12345',
        domisiliAddress: 'Jl. Test Domisili 125',
        domisiliVillage: 'Kelurahan Test',
        domisiliCity: 'Kota Test',
        domisiliProvince: 'Provinsi Test',
        domisiliPostalCode: '12345',
        verificationStatus: 'approved',
        nik: '1234567890123460',
        beneficiaryName: 'Test Beneficiary 3',
        beneficiaryNik: '1234567890123461',
        beneficiaryDateOfBirth: new Date('1988-03-10'),
        beneficiaryRelationship: 'orangtua'
      },
      {
        email: 'marketing2@test.com',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        fullName: 'Marketing Staff 2',
        role: 'marketing',
        phone: '081234567893',
        isActive: true,
        customCommissionRate: 0.03,
        phoneNumber: '+6281234567893',
        dateOfBirth: new Date('1992-07-20'),
        ktpAddress: 'Jl. Test KTP 126',
        ktpVillage: 'Kelurahan Test',
        ktpCity: 'Kota Test',
        ktpProvince: 'Provinsi Test',
        ktpPostalCode: '12345',
        domisiliAddress: 'Jl. Test Domisili 126',
        domisiliVillage: 'Kelurahan Test',
        domisiliCity: 'Kota Test',
        domisiliProvince: 'Provinsi Test',
        domisiliPostalCode: '12345',
        verificationStatus: 'approved',
        nik: '1234567890123462',
        beneficiaryName: 'Test Beneficiary 4',
        beneficiaryNik: '1234567890123463',
        beneficiaryDateOfBirth: new Date('1992-07-20'),
        beneficiaryRelationship: 'saudara_kandung'
      }
    ];

    console.log('📝 Creating test marketing users...');
    
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
      } else {
        const newUser = new User(userData);
        await newUser.save();
        console.log(`✅ Created user: ${userData.fullName} (${userData.email}) - Role: ${userData.role}`);
      }
    }

    console.log('\n📋 Checking existing marketing users...');
    const marketingUsers = await User.find({
      role: { $in: ['marketing', 'marketing_head', 'mitra'] }
    }).select('_id email fullName role customCommissionRate');

    console.log(`📊 Found ${marketingUsers.length} marketing users:`);
    marketingUsers.forEach(user => {
      const rate = user.customCommissionRate !== undefined 
        ? `${(user.customCommissionRate * 100).toFixed(2)}%` 
        : 'not set';
      console.log(`   - ${user.fullName} (${user.email}): ${rate}`);
    });

    console.log('\n✅ Test users creation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test users creation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createTestMarketingUsers();
}