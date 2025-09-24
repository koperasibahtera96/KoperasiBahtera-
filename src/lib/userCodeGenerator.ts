import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

/**
 * Generate a unique userCode in the format: BMS-{YY}{occupationCode}.{sequential}
 * This uses an atomic counter in MongoDB to avoid race conditions.
 */
export async function generateUserCode(occupationCode: string) {
  // Ensure DB connection
  await dbConnect();

  const currentYear = new Date().getFullYear().toString().slice(-2);
  const key = `BMS-${currentYear}${occupationCode}`;

  const countersColl = mongoose.connection.collection('user_code_counters');

  const res = await countersColl.findOneAndUpdate(
    { _id: key } as Record<string, any>,
    { $inc: { seq: 1 } } as any,
    { upsert: true, returnDocument: 'after' } as any
  );

  const seq = (res && (res.value as any)?.seq) ?? 1;

  const userCode = `BMS-${currentYear}${occupationCode}.${String(seq).padStart(4, '0')}`;

  return { userCode, sequential: seq };
}

export default generateUserCode;
