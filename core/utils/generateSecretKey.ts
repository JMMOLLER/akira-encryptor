import { createHash } from "crypto";

export default function generateSecretKey(passphrase: string): Uint8Array {
  const hash = createHash("sha256").update(passphrase).digest(); // SHA-256 da 32 bytes
  return new Uint8Array(hash);
}
