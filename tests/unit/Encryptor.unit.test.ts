import { describe, it, expect, beforeAll, afterAll } from "vitest";
import EncryptorClass from "@libs/Encryptor";
import hidefile from "hidefile";
import path from "path";
import fs from "fs";

let Encryptor: EncryptorClass;
const tempDir = path.resolve(__dirname, "tmp");
const testFolderPath = path.join(tempDir, "test-dir");
const testFilePath = path.join(tempDir, "test-file.txt");

beforeAll(async () => {
  Encryptor = await (
    await import("@libs/Encryptor")
  ).default.init("mypassword");

  // Crear el directorio temporal y el archivo de prueba
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(testFilePath, "Contenido secreto para pruebas.");
  // Crear un archivo de prueba dentro de una carpeta
  fs.mkdirSync(testFolderPath, { recursive: true });
  fs.writeFileSync(
    path.join(testFolderPath, "test-file.txt"),
    "Contenido secreto en el directorio."
  );
});

afterAll(async () => {
  // Eliminar archivo y carpeta temporal
  fs.rmSync(tempDir, { recursive: true, force: true });
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

  it("should encrypt and decrypt file correctly", async () => {
    const originalContent = fs.readFileSync(testFilePath, "utf-8");
    const res = await Encryptor.encryptFile({
      filePath: testFilePath,
      onProgress: () => {}
    });

    const encryptedFilePath = testFilePath.replace(
      path.basename(testFilePath),
      `${res.id}.enc`
    );
    const existTempFile = fs.existsSync(testFilePath);
    const existsEncTempFile = fs.existsSync(encryptedFilePath);

    expect(existTempFile).toBe(false);
    expect(existsEncTempFile).toBe(true);

    await Encryptor.decryptFile({
      filePath: encryptedFilePath,
      onProgress: () => {}
    });

    const decryptedFilePath = fs.existsSync(testFilePath);
    expect(decryptedFilePath).toBe(true);

    const decryptedContent = fs.readFileSync(testFilePath, "utf-8");
    expect(decryptedContent).toBe(originalContent);
  });

  it("should encrypt and decrypt folder correctly", async () => {
    const dirInfo = fs.readdirSync(testFolderPath);
    const originalContentFile = fs.readFileSync(
      path.join(testFolderPath, "test-file.txt"),
      "utf-8"
    );

    const res = await Encryptor.encryptFolder({
      filePath: testFolderPath,
      onProgress: () => {}
    });

    const encryptedFolderPath = path.join(tempDir, res.id);
    const existTempFile = fs.existsSync(
      path.join(testFolderPath, "test-file.txt")
    );
    const existsEncTempFile = fs.existsSync(encryptedFolderPath);

    expect(existTempFile).toBe(false);
    expect(existsEncTempFile).toBe(true);

    await Encryptor.decryptFolder({
      filePath: encryptedFolderPath,
      onProgress: () => {}
    });

    const decryptedFolderPath = fs.existsSync(testFolderPath);
    expect(decryptedFolderPath).toBe(true);

    const lastDirInfo = fs.readdirSync(testFolderPath);
    expect(lastDirInfo).toEqual(dirInfo);

    const decryptedContentFile = fs.readFileSync(
      path.join(testFolderPath, "test-file.txt"),
      "utf-8"
    );
    expect(decryptedContentFile).toBe(originalContentFile);
  });

  it("should hide and unhide files correctly", async () => {
    const res = await Encryptor.encryptFile({
      filePath: testFilePath,
      onProgress: () => {}
    });
    const encHiddenFilePath = testFilePath.replace(
      path.basename(testFilePath),
      `.${res.id}.enc`
    );

    const encryptedFilePath = testFilePath.replace(
      path.basename(testFilePath),
      `${res.id}.enc`
    );

    let hideStatus = await Encryptor.hideStoredItem(encryptedFilePath);
    expect(hideStatus).toBe(true);
    const isHidden = hidefile.isHiddenSync(encHiddenFilePath);
    expect(isHidden).toBe(true);

    hideStatus = await Encryptor.revealStoredItem(encHiddenFilePath);
    expect(hideStatus).toBe(true);
    const isVisible = hidefile.isHiddenSync(encryptedFilePath);
    expect(isVisible).toBe(false);

    await Encryptor.decryptFile({
      filePath: encryptedFilePath,
      onProgress: () => {}
    });
  });

  it("should hide and unhide folders correctly", async () => {
    const res = await Encryptor.encryptFolder({
      filePath: testFolderPath,
      onProgress: () => {}
    });
    const encHiddenFolderPath = path.join(tempDir, `.${res.id}`);

    const encFolderPath = path.join(tempDir, res.id);

    let hideStatus = await Encryptor.hideStoredItem(encFolderPath);
    expect(hideStatus).toBe(true);
    const isHidden = hidefile.isHiddenSync(encHiddenFolderPath);
    expect(isHidden).toBe(true);

    hideStatus = await Encryptor.revealStoredItem(encHiddenFolderPath);
    expect(hideStatus).toBe(true);
    const isVisible = hidefile.isHiddenSync(encFolderPath);
    expect(isVisible).toBe(false);

    await Encryptor.decryptFolder({
      filePath: encFolderPath,
      onProgress: () => {}
    });
  });
});
