import sodium from "libsodium-wrappers";

/**
 * @description `[ENG]` Generates a nonce for encryption.
 * @description `[ES]` Genera un nonce para la cifrado.
 */
export default function generateNonce(): Uint8Array {
  return sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
}
