import { ProgressCallback as PC } from "@akira-encryptor/core";

declare global {
  type ProgressCallback = PC;
  type CliAction = "encrypt" | "decrypt";
  type CliActionFor = "file" | "folder";
}
export {}