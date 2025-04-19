export type ProgressCallback = (
  processedBytes: number,
  totalBytes: number
) => void;

declare global {
  type CliAction = "encrypt" | "decrypt";
  type CliType = "file" | "folder";

  interface EncryptorFuncion {
    filePath: Readonly<string>;
    onProgress: ProgressCallback;
  }
}
