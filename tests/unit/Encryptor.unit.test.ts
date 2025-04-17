import { describe, it, expect, beforeAll } from "vitest";
import EncryptorClass from "@libs/Encryptor";

let Encryptor: typeof EncryptorClass;

beforeAll(async () => {
  Encryptor = (await import("@libs/Encryptor")).default;
});

describe("Encryptor", () => {
  it("should handle empty strings correctly", () => {
    const encrypted = Encryptor.encryptText("");
    const decrypted = Encryptor.decryptText(encrypted);

    expect(decrypted).toBe("");
  });

  it("should encrypt and decrypt a simple message", () => {
    const message = "Hola mundo seguro!";
    const encrypted = Encryptor.encryptText(message);
    const decrypted = Encryptor.decryptText(encrypted);

    expect(decrypted).toBe(message);
  });

  it("should throw an error when decrypting tampered data", () => {
    const encrypted = Encryptor.encryptText("Mensaje original");
    const tampered = encrypted.slice(0, -4) + "1234"; // tampering the encrypted string

    expect(() => Encryptor.decryptText(tampered)).toThrow("wrong secret key");
  });

  it("should return a base64 encoded encrypted string", () => {
    const encrypted = Encryptor.encryptText("Texto para test");
    expect(typeof encrypted).toBe("string");
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("should generate a unique nonce each time", () => {
    const nonce1 = Encryptor.generateNonce();
    const nonce2 = Encryptor.generateNonce();

    expect(nonce1).not.toBe(nonce2);
    expect(nonce1).toBeInstanceOf(Uint8Array);
    expect(nonce2).toBeInstanceOf(Uint8Array);
  });

  it("should throw an error if decryptText is called with an invalid format", () => {
    const invalidEncryptedText = "invalid_base64_string";

    expect(() => Encryptor.decryptText(invalidEncryptedText)).toThrow();
  });
});
