import { ProgressCallback as PC } from "@akira-encryptor/core";

declare global {
  declare namespace NodeJS {
    interface Process {
      pkg?: {
        path: {
          resolve: (...args: string[]) => string;
        };
        entrypoint: string;
        defaultEntrypoint: string;
      };
    }
  }

  type ProgressCallback = PC;
  type CliAction = "encrypt" | "decrypt";
  type CliActionFor = "file" | "folder";
}
export {};
