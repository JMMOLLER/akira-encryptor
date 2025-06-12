import { workerPath as baseWorkerPath } from "@akira-encryptor/core/workers/encryptor";

export const workerPath = process.pkg
  ? process.pkg.path.resolve("encryptor.worker.js")
  : baseWorkerPath!;
