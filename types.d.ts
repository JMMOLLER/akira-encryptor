type ProgressCallback = (processedBytes: number, totalBytes: number) => void;
type CliAction = "encrypt" | "decrypt";
type CliType = "file" | "folder";

interface EncryptorFuncion {
  filePath: Readonly<string>;
  onProgress: ProgressCallback;
}
