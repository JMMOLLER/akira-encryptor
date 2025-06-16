import { encryptorWorkerPath } from "@akira-encryptor/core/workers";

if (!encryptorWorkerPath) {
  throw new Error("Unable to find the encryptor worker path.");
}

export const workerPath = encryptorWorkerPath;
