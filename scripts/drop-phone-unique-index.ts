/**
 * Drops the MongoDB unique index on users.phoneNumber if it exists.
 * Run after removing unique: true from User model (Task 1 of bug-fixes-batch).
 * Usage: npx tsx scripts/drop-phone-unique-index.ts
 */
import mongoose from 'mongoose';
import dbConnect from '../src/lib/mongodb';
import User from '../src/models/User';

async function dropPhoneUniqueIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await dbConnect();
    const coll = User.collection;
    const indexes = await coll.indexes();
    const phoneUnique = indexes.find(
      (idx: any) => idx.key?.phoneNumber === 1 && idx.unique === true
    );
    if (!phoneUnique) {
      console.log('No unique index on phoneNumber found. Nothing to drop.');
      process.exit(0);
      return;
    }
    const name = (phoneUnique as any).name || 'phoneNumber_1';
    await coll.dropIndex(name);
    console.log(`Dropped index: ${name}`);
    process.exit(0);
  } catch (e) {
    console.error('Error dropping phone unique index:', e);
    process.exit(1);
  } finally {
    await mongoose.connection?.close?.();
  }
}

dropPhoneUniqueIndex();
