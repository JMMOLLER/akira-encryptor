import { describe, it, expect, beforeAll, vi } from "vitest";
import EncryptorClass from "@libs/Encryptor";
import { FileSystem } from "@libs/FileSystem";

let Encryptor: EncryptorClass;
let mockFS: FileSystem;

beforeAll(async () => {
  // Mock FileSystem
  mockFS = {
    read: vi.fn(() => new Map()),
    getStatFile: vi.fn((filePath) => ({ size: 1024 })),
    createReadStream: vi.fn(() => ({
      on: vi.fn((event, callback) => {
        if (event === "data") callback(Buffer.from("test data"));
        if (event === "end") callback();
      })
    })),
    createWriteStream: vi.fn(() => ({
      write: vi.fn(),
      end: vi.fn()
    })),
    replaceFile: vi.fn(() => Promise.resolve()),
    removeFile: vi.fn(() => Promise.resolve()),
    readDir: vi.fn(() => [
      { name: "file1.txt", isFile: () => true, isDirectory: () => false },
      { name: "subfolder", isFile: () => false, isDirectory: () => true }
    ]),
    safeRenameFolder: vi.fn(() => Promise.resolve()),
    add: vi.fn((name) => `encrypted_${name}`),
    getByUID: vi.fn((uid) => `decrypted_${uid}`),
    removeFromLibrary: vi.fn(),
    readFile: vi.fn(() => Buffer.from("test data"))
  } as unknown as FileSystem;

  vi.spyOn(FileSystem, "getInstance").mockReturnValue(mockFS);

  // Initialize Encryptor
  Encryptor = await (await import("@libs/Encryptor")).default.init("mypassword");
});

describe("Encryptor Integration Tests", () => {
  it("should encrypt and decrypt text correctly", () => {
    const originalText = "Hello, secure world!";
    const encryptedText = Encryptor.encryptText(originalText);
    const decryptedText = Encryptor.decryptText(encryptedText);

    expect(decryptedText).toBe(originalText);
  });

  // it("should encrypt and decrypt a file", async () => {
  //   const filePath = "test.txt";
  //   const onProgress = vi.fn();

  //   // Create the test file
  //   mockFS.createFile(filePath);

  //   const encryptedPath = await Encryptor.encryptFile({ filePath, onProgress });
  //   expect(mockFS.replaceFile).toHaveBeenCalled();
  //   expect(encryptedPath).toContain(".enc");

  //   await Encryptor.decryptFile({ filePath: encryptedPath, onProgress });
  //   expect(mockFS.removeFile).toHaveBeenCalled();
  // });

  // it("should encrypt and decrypt a folder", async () => {
  //   const folderPath = "testFolder";
  //   const onProgress = vi.fn();

  //   await fs.promises.mkdir(folderPath, { recursive: true });

  //   try {
  //     await Encryptor.encryptFolder({ filePath: folderPath, onProgress });
  //     expect(mockFS.safeRenameFolder).toHaveBeenCalled();

  //     const decryptedPath = await Encryptor.decryptFolder({
  //       filePath: folderPath,
  //       onProgress
  //     });
  //     expect(decryptedPath).toContain("decrypted_");
  //   } finally {
  //     await fs.promises.rm(folderPath, { recursive: true, force: true });
  //   }
  // });

  // it("should handle empty files gracefully", async () => {
  //   mockFS.getStatFile.mockReturnValueOnce({ size: 0 });
  //   const filePath = "empty.txt";
  //   const onProgress = vi.fn();

  //   const encryptedPath = await Encryptor.encryptFile({ filePath, onProgress });
  //   expect(encryptedPath).toContain(".enc");

  //   await Encryptor.decryptFile({ filePath: encryptedPath, onProgress });
  //   expect(mockFS.removeFile).toHaveBeenCalled();
  // });

  it("should throw an error for invalid decryption input", () => {
    const invalidEncryptedText = "invalid_base64_string";

    expect(() => Encryptor.decryptText(invalidEncryptedText)).toThrow();
  });
});
