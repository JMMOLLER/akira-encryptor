import decryptFile from "../crypto/decryptFile";
import encryptFile from "../crypto/encryptFile";

export default async function run(params: WorkerTask) {
  const { taskType, filePath, tempPath, SECRET_KEY, blockSize } = params;
  try {
    if (taskType === "decrypt" && !params.blockSize) {
      throw new Error("Block size is required for decryption.");
    }
    const handlerFunction = taskType === "encrypt" ? encryptFile : decryptFile;
    await handlerFunction({
      filePath,
      onProgress: (processedBytes) => {
        params.port?.postMessage({
          type: "progress",
          processedBytes
        });
      },
      SECRET_KEY,
      tempPath,
      blockSize: blockSize!
    });

    return;
  } catch (error) {
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

let workerPath: string | undefined;

if (typeof import.meta !== "undefined" && import.meta.url) {
  workerPath = import.meta.url;
} else if (typeof __filename !== "undefined") {
  workerPath = __filename;
} else {
  workerPath = undefined;
}

export { workerPath };
