import crypto from 'crypto';

// Use environment variable for encryption key in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-char-long!';
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), // Ensure key is 32 bytes
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivString, encryptedText] = text.split(':');
  if (!ivString || !encryptedText) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(ivString, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    iv
  );
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Check if a string is encrypted by checking if it has the expected format
export function isEncrypted(text: string): boolean {
  return text.includes(':');
}
