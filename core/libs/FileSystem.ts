import { pipeline } from "stream/promises";
import { Readable } from "stream";
import delay from "@utils/delay";
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
   */
  removeFile(path: string) {
    if (!fs.existsSync(path)) {
      return;
    }

    try {
      fs.unlinkSync(path);
    } catch (error) {
      return;
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
  renameFolder(folderPath: string, newPath: string) {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Directory not found: ${folderPath}`);
    }

    try {
      fs.renameSync(folderPath, newPath);
    } catch (error) {
      throw new Error(
        `Error renaming directory '${folderPath}': ${(error as Error).message}`
      );
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
  async safeRenameFolder(src: string, dest: string, retries = 20): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        this.renameFolder(src, dest);
        return;
      } catch (err) {
        if (i === retries - 1) throw err;
        await delay(100 * (i + 1)); // backoff exponencial
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
