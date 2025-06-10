export const workerPath = process.pkg
  ? process.pkg.path.resolve(
      "../../cli/node_modules/@akira-encryptor/core/dist/cjs/workers/encryptor.worker.cjs"
    )
  : import.meta.resolve("@akira-encryptor/core/workers/encryptor.worker");
