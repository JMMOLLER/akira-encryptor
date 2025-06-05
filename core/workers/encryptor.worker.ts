import decryptFile from "core/helpers/decryptFile.helper";
import encryptFile from "core/helpers/encryptFile.helper";

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
