export const workerPath = process.pkg
  ? process.pkg.path.resolve(
      "../../cli/node_modules/@akira-encryptor/core/dist/workers/encryptor.worker.cjs"
    )
  : import.meta.resolve("@akira-encryptor/core/dist/workers/encryptor.worker.cjs");
