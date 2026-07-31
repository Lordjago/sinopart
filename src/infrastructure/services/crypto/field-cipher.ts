/**
 * FieldCipher — symmetric encryption for sensitive fields at rest (bank account
 * numbers today).
 * ---------------------------------------------------------------------------
 * AES-256-GCM: authenticated encryption, so a tampered ciphertext fails to
 * decrypt rather than returning garbage. The 32-byte key is derived from a
 * secret via scrypt; a fresh random IV per call means the same number encrypts
 * to a different blob every time.
 *
 * Output format:  base64(iv):base64(tag):base64(ciphertext)
 *
 * This is an infrastructure concern — the core deals only in plaintext and never
 * sees this class. Provided in ServiceModule; injected into the supplier repo.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

export class FieldCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = scryptSync(secret, 'sinopart:field-cipher:v1', 32);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      tag.toString('base64'),
      enc.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Malformed ciphertext.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
