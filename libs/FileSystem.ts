import generateUID from "@utils/generateUID";
import validateUID from "@utils/validateUID";
import { pipeline } from "stream/promises";
import { env } from "@configs/env";
import { Readable } from "stream";
import fs from "fs";

export class FileSystem {
  private static readonly LIBRARY_PATH = env.LIBRARY_PATH;
  private static instance: FileSystem;

  private constructor() {}

  static getInstance(): FileSystem {
    if (!FileSystem.instance) {
      FileSystem.instance = new FileSystem();
    }
    return FileSystem.instance;
  }

  /**
   * @description `[ENG]` Adds a value to the library with a unique identifier.
   * @description `[ESP]` Agrega un valor a la biblioteca con un identificador único.
   * @param val Value to be added to the library
   */
  add(val: string) {
    const UID = generateUID();
    const map = this.read();
    map.set(UID, val);
    this.save(map);
    return UID;
  }

  /**
   * @description `[ENG]` Save the map of values to the library.
   * @description `[ESP]` Guarda el mapa de valores en la biblioteca.
   * @param map Map of values to be saved
   */
  private save(map: Map<string, string>) {
    const obj = Object.fromEntries(map);
    try {
      fs.writeFileSync(FileSystem.LIBRARY_PATH, JSON.stringify(obj, null, 2));
    } catch (error) {
      throw new Error(
        `Error saving library to '${FileSystem.LIBRARY_PATH}': ${
          (error as Error).message
        }`
      );
    }
  }

  /**
   * @description `[ENG]` Read the library and return a map of values.
   * @description `[ESP]` Lee la biblioteca y devuelve un mapa de valores.
   */
  read(): Map<string, string> {
    if (!fs.existsSync(FileSystem.LIBRARY_PATH)) return new Map();

    try {
      const data = fs.readFileSync(FileSystem.LIBRARY_PATH, "utf-8");
      const jsonData = JSON.parse(data);
      return new Map(Object.entries(jsonData));
    } catch (error) {
      throw new Error(
        `Error reading library from '${FileSystem.LIBRARY_PATH}': ${
          (error as Error).message
        }`
      );
    }
  }

  /**
   * @description `[ENG]` Remove a value from the library by its unique identifier.
   * @description `[ESP]` Elimina un valor de la biblioteca por su identificador único.
   * @param UID `string` - The unique identifier of the value to be removed.
   */
  removeFromLibrary(UID: string) {
    validateUID(UID);

    const map = this.read();
    if (!map.has(UID)) {
      throw new Error(`UID not found: ${UID}`);
    }
    map.delete(UID);
    this.save(map);
  }

  /**
   * @description `[ENG]` Get a value from the library by its unique identifier.
   * @description `[ESP]` Obtiene un valor de la biblioteca por su identificador único.
   * @param UID `string` - The unique identifier of the value to be retrieved.
   */
  getByUID(UID: string) {
    validateUID(UID);

    const map = this.read();
    const value = map.get(UID);
    if (!value) {
      throw new Error(`Value not found for UID: ${UID}`);
    }
    return value;
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
  createWriteStream(path: string) {
    return fs.createWriteStream(path);
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
}
