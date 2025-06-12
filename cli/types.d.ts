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

  type CliAction = "encrypt" | "decrypt";
  type CliActionFor = "file" | "folder";
}
export {};
