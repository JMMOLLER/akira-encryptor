import { pipeline } from "stream/promises";
import { Readable } from "stream";
import delay from "../utils/delay";
import path from "path";
import fs from "fs";

// TODO: Add a function to check if a file or directory is locked.
// TODO: agregar una funcion para bloquear un archivo o directorio.

export class FileSystem {
  private static instance: FileSystem;

  private constructor() {}

  static getInstance(): FileSystem {
    if (!FileSystem.instance) {
      FileSystem.instance = new FileSystem();
    }
    return FileSystem.instance;
  }

  /**
   * @description `[ENG]` Get the file statistics of a file.
   * @description `[ESP]` Obtiene las estadísticas del archivo de un archivo.
   * @param path `string` - The path of the file to be checked.
   */
  getStatFile(path: string) {
    if (!fs.existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }

    return fs.statSync(path);
  }

  /**
   * @description `[ENG]` Get the size of a folder and its contents.
   * @description `[ESP]` Obtiene el tamaño de una carpeta y su contenido.
   * @param dirPath `string` - The path of the directory to be checked.
   */
  getFolderSize(dirPath: string) {
    let totalSize = 0;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        const stats = this.getStatFile(fullPath);
        totalSize += stats.size;
      } else if (entry.isDirectory()) {
        totalSize += this.getFolderSize(fullPath);
      }
    }

    return totalSize;
  }

  /**
   * @description `[ENG]` Create a readable stream from a file.
   * @description `[ESP]` Crea un flujo de lectura desde un archivo.
   * @param path `string` - The path of the file to be read.
   * @param highWaterMark `number` - The size of each chunk to be read (optional).
   */
  createReadStream(path: string, highWaterMark?: number) {
    if (!fs.existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }

    return fs.createReadStream(path, {
      highWaterMark
    });
  }

  /**
   * @description `[ENG]` Create a writable stream to a file.
   * @description `[ESP]` Crea un flujo de escritura a un archivo.
   * @param path `string` - The path of the file to be created.
   */
  createWriteStream(path: string, options?: any) {
    return fs.createWriteStream(path, options);
  }

  /**
   * @description `[ENG]` Remove a file from the filesystem.
   * @description `[ESP]` Elimina un archivo del sistema de archivos.
   * @param path `string` - The path of the file to be removed.
   * @param retries `number` - The number of retries to attempt if the removal fails (default: 15).
   */
  async removeFile(path: string, retries = 15) {
    if (!fs.existsSync(path)) {
      return Promise.reject(new Error(`File not found: ${path}`));
    }

    for (let i = 0; i < retries; i++) {
      try {
        fs.unlinkSync(path);
        return;
      } catch (error) {
        if (error instanceof Error) {
          await this.printAttempt(`remove file '${path}'`, error, i, retries);
        } else {
          return Promise.reject(error);
        }
      }
    }
  }

  /**
   * @description `[ENG]` Print an attempt message for a file operation.
   * @description `[ESP]` Imprime un mensaje de intento para una operación de archivo.
   * @param text The text to be printed
   * @param error Error object
   * @param retryCount The current retry count
   * @param maxRetries The maximum number of retries
   */
  async printAttempt(
    text: string,
    error: NodeJS.ErrnoException,
    retryCount: number,
    maxRetries: number
  ) {
    if (error.code === "EBUSY" && retryCount < maxRetries) {
      console.log(`Attempt ${retryCount + 1} to ${text} failed.`);
      await delay(100 * (retryCount + 1));
    } else if (error.code === "EPERM") {
      console.error(
        `\n❌ Permission denied to ${text}. Please close any applications using it, try open the script as administrator, or exclude the script from antivirus.`
      );
      return Promise.reject(error);
    } else {
      return Promise.reject(error);
    }
  }

  /**
   * @description `[ENG]` Read a file from the filesystem.
   * @description `[ESP]` Lee un archivo del sistema de archivos.
   * @param path `string` - The path of the file to be read.
   */
  readFile(path: string) {
    if (!fs.existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }

    try {
      return fs.readFileSync(path);
    } catch (error) {
      throw new Error(
        `Error reading file '${path}': ${(error as Error).message}`
      );
    }
  }

  /**
   * @description `[ENG]` Replace a file with a new one.
   * @description `[ESP]` Reemplaza un archivo por uno nuevo.
   * @param prevPath The path of the file to be replaced
   * @param newPath The new path for the file
   * @param data Data to be written to the new file
   */
  async replaceFile(
    source: string,
    newPath: string,
    data: Buffer | Uint8Array | string
  ): Promise<void> {
    try {
      // Determinar si 'data' es un path temporal o contenido en memoria
      const readable =
        typeof data === "string"
          ? fs.createReadStream(data) // Es un archivo temporal
          : Readable.from(data); // Es un buffer/memoria

      const writable = fs.createWriteStream(newPath);
      await pipeline(readable, writable);

      // Solo eliminar si 'source' ≠ 'newPath' y no es el mismo archivo
      if (
        typeof data === "string" && // solo si viene de archivo temporal
        source !== newPath
      ) {
        await fs.promises.unlink(data).catch(() => {}); // Silencioso
      }

      // También eliminar el archivo original (fuente) si es distinto al destino
      if (source !== newPath) {
        await fs.promises.unlink(source).catch(() => {});
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unknown error";
      throw new Error(`Error al reemplazar archivo: ${message}`);
    }
  }

  /**
   * @description `[ENG]` Read a directory from the filesystem.
   * @description `[ESP]` Lee un directorio del sistema de archivos.
   * @param folderPath `string` - The path of the folder to be read.
   */
  readDir(folderPath: string) {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Directory not found: ${folderPath}`);
    }

    try {
      return fs.readdirSync(folderPath, {
        withFileTypes: true
      });
    } catch (error) {
      throw new Error(
        `Error reading directory '${folderPath}': ${(error as Error).message}`
      );
    }
  }

  /**
   * @description `[ENG]` Rename a folder in the filesystem.
   * @description `[ESP]` Renombra una carpeta en el sistema de archivos.
   * @param folderPath `string` - The path of the folder to be renamed.
   * @param newPath `string` - The new path for the folder.
   */
  private renameFolder(folderPath: string, newPath: string) {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Directory not found: ${folderPath}`);
    }

    try {
      fs.renameSync(folderPath, newPath);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @description `[ENG]` Create a folder in the filesystem.
   * @description `[ESP]` Crea una carpeta en el sistema de archivos.
   * @param folderPath `string` - The path of the folder to be created.
   */
  createFolder(folderPath: string) {
    if (fs.existsSync(folderPath)) {
      throw new Error(`Directory already exists: ${folderPath}`);
    }

    try {
      fs.mkdirSync(folderPath, { recursive: true });
    } catch (error) {
      throw new Error(
        `Error creating directory '${folderPath}': ${(error as Error).message}`
      );
    }
  }

  /**
   * @description `[ENG]` Safely rename a folder in the filesystem with retries.
   * @description `[ESP]` Renombra una carpeta de forma segura en el sistema de archivos con reintentos.
   * @param src `string` - The source path of the folder to be renamed.
   * @param dest `string` - The destination path for the renamed folder.
   * @param retries `number` - The number of retries to attempt if the rename fails (default: 20).
   */
  async safeRenameFolder(
    src: string,
    dest: string,
    retries = 15
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        this.renameFolder(src, dest);
        return;
      } catch (err) {
        if (err instanceof Error) {
          await this.printAttempt(`rename folder '${src}'`, err, i, retries);
        } else {
          return Promise.reject(err);
        }
      }
    }
  }

  async copyFile(src: string, dest: string, retries = 15): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        fs.copyFileSync(src, dest);
        return;
      } catch (err) {
        if (err instanceof Error) {
          await this.printAttempt(`copy file '${src}'`, err, i, retries);
        } else {
          return Promise.reject(err);
        }
      }
    }
  }

  fileExists(path: string): boolean {
    try {
      return fs.existsSync(path);
    } catch (error) {
      throw error;
    }
  }
}
