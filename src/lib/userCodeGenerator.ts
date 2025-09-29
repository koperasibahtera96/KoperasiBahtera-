import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Generate a unique userCode in the format: BMS-{YY}{occupationCode}.{sequential}
 * This gets the last user with the same year/occupation pattern and increments the sequence.
 * Includes retry logic to handle potential race conditions.
 */
export async function generateUserCode(occupationCode: string, maxRetries = 5) {
  // Ensure DB connection
  await dbConnect();

  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = `BMS-${currentYear}${occupationCode}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Find the last user with this prefix pattern
      const lastUser = await User.findOne(
        {
          userCode: {
            $regex: `^${prefix}\\.\\d{4}$`
          }
        },
        { userCode: 1 }
      ).sort({ userCode: -1 });

      let nextSequence = 1;

      if (lastUser && lastUser.userCode) {
        // Extract the sequence number from the last userCode
        const match = lastUser.userCode.match(/\.(\d{4})$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }

      const userCode = `${prefix}.${String(nextSequence).padStart(4, '0')}`;

      // Check if this userCode already exists (additional safety check)
      const existingUser = await User.findOne({ userCode }, { _id: 1 });

      if (!existingUser) {
        return { userCode, sequential: nextSequence };
      }

      // If userCode exists, continue to next attempt
      console.log(`UserCode ${userCode} already exists, retrying... (attempt ${attempt + 1}/${maxRetries})`);

      // Add small delay to reduce race condition probability
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    } catch (error) {
      console.error(`Error generating userCode (attempt ${attempt + 1}/${maxRetries}):`, error);
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw new Error(`Failed to generate unique userCode after ${maxRetries} attempts`);
}

export default generateUserCode;
