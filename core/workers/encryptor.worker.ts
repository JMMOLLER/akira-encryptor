import { encryptFile } from "core/helpers/encryptFile.helper";

export default async function run(params: WorkerTask) {
  const { taskType, filePath, tempPath, SECRET_KEY } = params;
  try {
    const func = taskType === "encrypt" ? encryptFile : encryptFile;
    await func({
      filePath,
      onProgress: (processedBytes) => {
        params.port?.postMessage({
          type: "progress",
          processedBytes
        });
      },
      SECRET_KEY,
      tempPath
    });

    return;
  } catch (error) {
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
