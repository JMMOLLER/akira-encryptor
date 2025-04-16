import generateSecretKey from "@utils/generateSecretKey";
import { FileSystem } from "./FileSystem";
import sodium from "libsodium-wrappers";
import { env } from "@configs/env";
import path from "path";

class Encryptor {
  private static SECRET_KEY: Uint8Array;
  private static readonly ENCODING = env.ENCODING as BufferEncoding;
  private static readonly FS = FileSystem.getInstance();
  private static instance: Encryptor;

  private constructor() {}

  static async getInstance(): Promise<Encryptor> {
    if (!Encryptor.instance) {
      await sodium.ready;
      Encryptor.SECRET_KEY = generateSecretKey(env.PASSWORD);
      Encryptor.instance = new Encryptor();
    }
    return Encryptor.instance;
  }

  /**
   * @description `[ENG]` Generates a nonce for encryption.
   * @description `[ES]` Genera un nonce para la cifrado.
   */
  generateNonce(): Uint8Array {
    return sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  }

  /**
   * @description `[ENG]` Encrypts the given text using the secret key and a nonce.
   * @description `[ES]` Cifra el texto dado utilizando la clave secreta y un nonce.
   * @param txt - The text to be encrypted
   */
  encryptText(txt: string): string {
    // Convert the text to bytes
    const textBytes = sodium.from_string(txt);
    const nonce = this.generateNonce();

    // Encrypt the text using the nonce and secret key
    const cipher = sodium.crypto_secretbox_easy(
      textBytes,
      nonce,
      Encryptor.SECRET_KEY
    );

    // Combine the nonce and cipher into a single Uint8Array
    const combined = new Uint8Array(nonce.length + cipher.length);
    combined.set(nonce);
    combined.set(cipher, nonce.length);

    return Buffer.from(combined).toString(Encryptor.ENCODING);
  }

  /**
   * @description `[ENG]` Decrypts the given encrypted text using the secret key.
   * @description `[ES]` Descifra el mensaje cifrado dado utilizando la clave secreta.
   * @param encryptedText - The encrypted text to be decrypted
   */
  decryptText(encryptedText: string): string | null {
    // Convert the encrypted text to bytes
    const combined = new Uint8Array(
      Buffer.from(encryptedText, Encryptor.ENCODING)
    );

    // Get the nonce and cipher from the combined array
    const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const cipher = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

    // Decrypt the cipher using the nonce and secret key
    const decrypted = sodium.crypto_secretbox_open_easy(
      cipher,
      nonce,
      Encryptor.SECRET_KEY
    );
    if (!decrypted) return null;

    return sodium.to_string(decrypted);
  }

  /**
   * @description `[ENG]` Prints the map of encrypted messages. If `withDecrypt` is true, it decrypts the messages before printing.
   * @description `[ES]` Imprime el mapa de mensajes cifrados. Si `withDecrypt` es verdadero, descifra los mensajes antes de imprimir.
   * @param withDecrypt `true` to decrypt the messages before printing, `false` to print the encrypted messages as is.
   */
  printMap(withDecrypt?: boolean) {
    const map = Encryptor.FS.read();
    if (withDecrypt) {
      for (const [id, mensajeCifrado] of map) {
        const decryptedMsg = this.decryptText(mensajeCifrado);
        console.log(
          `ID: ${id}, Mensaje: ${decryptedMsg || "Mensaje no válido"}`
        );
      }
    } else {
      console.log(map);
    }
  }

  /**
   * @description `[ENG]` Encrypts a file using the secret key and saves it with a new name.
   * @description `[ES]` Cifra un archivo utilizando la clave secreta y lo guarda con un nuevo nombre.
   * @param filePath `string` - The path of the file to be encrypted (read-only).
   */
  encryptFile(filePath: Readonly<string>, onProgress?: ProgressCallback) {
    const stat = Encryptor.FS.getStatFile(filePath);
    const totalSize = stat.size;
    let processed = 0;

    const readStream = Encryptor.FS.createReadStream(filePath);
    const chunks: Buffer[] = [];

    readStream.on("data", (chunk: string | Buffer) => {
      const nonce = this.generateNonce();
      const chunkArray =
        typeof chunk === "string"
          ? sodium.from_string(chunk)
          : new Uint8Array(chunk);
      const encryptedChunk = sodium.crypto_secretbox_easy(
        chunkArray,
        nonce,
        Encryptor.SECRET_KEY
      );
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32BE(encryptedChunk.length, 0);

      chunks.push(Buffer.from(nonce));
      chunks.push(lengthBuffer);
      chunks.push(Buffer.from(encryptedChunk));

      processed += chunk.length;
      onProgress?.(processed, totalSize);
    });

    readStream.on("end", () => {
      const combined = Buffer.concat(chunks);
      const fileName = path.basename(filePath);
      const encryptedName = this.encryptText(fileName);
      const newFileName = Encryptor.FS.add(encryptedName);
      const newPath = filePath.replace(fileName, `${newFileName}.enc`);

      Encryptor.FS.replaceFile(filePath, newPath, combined);
    });

    readStream.on("error", (error: Error) => {
      throw new Error(`Error reading file: ${error.message}`);
    });
  }

  /**
   * @description `[ENG]` Decrypts a file using the secret key and saves it with the original name.
   * @description `[ES]` Descifra un archivo utilizando la clave secreta y lo guarda con el nombre original.
   * @param filePath `string` - The path of the file to be decrypted (read-only).
   */
  decryptFile(filePath: Readonly<string>, onProgress?: ProgressCallback) {
    const stat = Encryptor.FS.getStatFile(filePath);
    const totalSize = stat.size;
    let processed = 0;

    const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
    const macLength = sodium.crypto_secretbox_MACBYTES;
    const chunkSize = 64 * 1024;
    const blockSize = chunkSize + macLength;

    const tempPath = filePath + ".dec.temp";
    const readStream = Encryptor.FS.createReadStream(filePath, blockSize);
    const writeStream = Encryptor.FS.createWriteStream(tempPath);

    let leftover = Buffer.alloc(0);

    readStream.on("data", (chunk: Buffer | string) => {
      const chunkArray =
        typeof chunk === "string"
          ? sodium.from_string(chunk)
          : new Uint8Array(chunk);
      leftover = Buffer.concat([leftover, chunkArray]);

      while (leftover.length >= nonceLength + macLength) {
        // Extraer nonce
        const chunkNonce = leftover.subarray(0, nonceLength);
        const lengthBuffer = leftover.subarray(nonceLength, nonceLength + 4);
        const encryptedLength = lengthBuffer.readUInt32BE(0);

        // Si no hay suficiente para un bloque cifrado, esperar más datos
        if (leftover.length < macLength + 4 + encryptedLength) {
          break;
        }

        // Extraer chunk cifrado
        const encryptedChunk = leftover.subarray(
          nonceLength + 4,
          nonceLength + 4 + encryptedLength
        );
        leftover = leftover.subarray(nonceLength + 4 + encryptedLength);

        const decrypted = sodium.crypto_secretbox_open_easy(
          encryptedChunk,
          chunkNonce,
          Encryptor.SECRET_KEY
        );

        if (!decrypted) {
          throw new Error("Error al descifrar un bloque del archivo.");
        }

        writeStream.write(Buffer.from(decrypted));
        processed += nonceLength + 4 + encryptedLength;
        onProgress?.(processed, totalSize);
      }
    });

    readStream.on("end", () => {
      writeStream.end(async () => {
        try {
          const fileName = path.basename(filePath).replace(/\.enc$/, "");
          const encryptedFileName = Encryptor.FS.getByUID(fileName);
          const originalFileName = this.decryptText(encryptedFileName);

          if (!originalFileName) {
            throw new Error("No se pudo descifrar el nombre del archivo.");
          }

          const restoredPath = filePath.replace(
            path.basename(filePath),
            originalFileName
          );
          Encryptor.FS.replaceFile(
            tempPath,
            restoredPath,
            Encryptor.FS.readFile(tempPath)
          );
          Encryptor.FS.removeFile(filePath);
          Encryptor.FS.removeFromLibrary(fileName);
        } catch (err) {
          Encryptor.FS.removeFile(tempPath);
          throw err;
        }
      });
    });

    readStream.on("error", (err) => {
      Encryptor.FS.removeFile(tempPath);
      throw err;
    });
    writeStream.on("error", (err) => {
      Encryptor.FS.removeFile(tempPath);
      throw err;
    });
  }
}

export default await Encryptor.getInstance();
