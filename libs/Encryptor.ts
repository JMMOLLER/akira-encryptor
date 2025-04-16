import generateSecretKey from "@utils/generateSecretKey";
import { decodeUTF8, encodeUTF8 } from "tweetnacl-util";
import { FileSystem } from "./FileSystem";
import { env } from "@configs/env";
import nacl from "tweetnacl";
import path from "path";

class Encryptor {
  private static readonly SECRET_KEY = generateSecretKey(env.PASSWORD);
  private static readonly ENCODING = env.ENCODING as BufferEncoding;
  private static readonly STORAGE = FileSystem.getInstance();
  private static instance: Encryptor;

  private constructor() {}

  static getInstance(): Encryptor {
    if (!Encryptor.instance) {
      Encryptor.instance = new Encryptor();
    }
    return Encryptor.instance;
  }

  /**
   * @description `[ENG]` Generates a nonce for encryption.
   * @description `[ES]` Genera un nonce para la cifrado.
   */
  generateNonce() {
    return nacl.randomBytes(nacl.secretbox.nonceLength);
  }

  /**
   * @description `[ENG]` Encrypts the given text using the secret key and a nonce.
   * @description `[ES]` Cifra el texto dado utilizando la clave secreta y un nonce.
   * @param txt - The text to be encrypted
   */
  encryptText(txt: string): string {
    // Convert text to Uint8Array
    const msgToBytes = decodeUTF8(txt);

    // Generate a nonce for encryption
    const nonce = this.generateNonce();

    // Encrypt the text using the secret key and nonce
    const encryptedText = nacl.secretbox(
      msgToBytes,
      nonce,
      Encryptor.SECRET_KEY
    );

    /**
     * @name encryptedMsgWithNonce
     */
    const encMsgWithNonce = new Uint8Array(nonce.length + encryptedText.length);
    encMsgWithNonce.set(nonce);
    encMsgWithNonce.set(encryptedText, nonce.length);

    // Return the encrypted text as selected encoding
    return Buffer.from(encMsgWithNonce).toString(Encryptor.ENCODING);
  }

  /**
   * @description `[ENG]` Decrypts the given encrypted text using the secret key.
   * @description `[ES]` Descifra el mensaje cifrado dado utilizando la clave secreta.
   * @param encryptedText - The encrypted text to be decrypted
   */
  decryptText(encryptedText: string): string | null {
    /**
     * @name encryptedMsgWithNonce
     */
    const encMsgWithNonce = new Uint8Array(
      Buffer.from(encryptedText, Encryptor.ENCODING)
    );

    // Extract the nonce (the first bytes of the encrypted text)
    const nonce = encMsgWithNonce.slice(0, nacl.secretbox.nonceLength);

    // Extract the actual encrypted message (the rest of the bytes)
    const encryptedMsg = encMsgWithNonce.slice(nacl.secretbox.nonceLength);

    // Try to decrypt the message using the secret key and nonce
    const decryptedText = nacl.secretbox.open(
      encryptedMsg,
      nonce,
      Encryptor.SECRET_KEY
    );

    if (!decryptedText) {
      // If decryption fails, return null
      return null;
    }

    // Convert the decrypted text from Uint8Array to string
    return encodeUTF8(decryptedText);
  }

  /**
   * @description `[ENG]` Prints the map of encrypted messages. If `withDecrypt` is true, it decrypts the messages before printing.
   * @description `[ES]` Imprime el mapa de mensajes cifrados. Si `withDecrypt` es verdadero, descifra los mensajes antes de imprimir.
   * @param withDecrypt `true` to decrypt the messages before printing, `false` to print the encrypted messages as is.
   */
  printMap(withDecrypt?: boolean) {
    const map = Encryptor.STORAGE.read();
    if (withDecrypt) {
      for (const [id, mensajeCifrado] of map) {
        const mensajeDescifrado = this.decryptText(mensajeCifrado);
        if (mensajeDescifrado) {
          console.log(`ID: ${id}, Mensaje: ${mensajeDescifrado}`);
        } else {
          console.log(`ID: ${id}, Mensaje no válido`);
        }
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
  encryptFile(filePath: Readonly<string>) {
    try {
      // Read the file as a buffer
      const fileBuffer = Encryptor.STORAGE.getFile(filePath);
      const fileUnit8 = new Uint8Array(fileBuffer);

      const nonce = this.generateNonce();
      const encryptedFile = nacl.secretbox(
        fileUnit8,
        nonce,
        Encryptor.SECRET_KEY
      );

      // Concatenate nonce and encrypted file
      const combined = new Uint8Array(nonce.length + encryptedFile.length);
      combined.set(nonce);
      combined.set(encryptedFile, nonce.length);

      // Convert to Buffer and save to file
      const combinedBuffer = Buffer.from(combined);

      // Extract the file name from the path
      const fileName = path.basename(filePath);
      // Encrypt the file name and generate a new file name
      const newFileName = Encryptor.STORAGE.add(this.encryptText(fileName));
      // Create a new path for the encrypted file
      const newPath = new String(filePath).replace(
        fileName,
        `${newFileName}.enc`
      );

      // Save the encrypted file with the new name
      Encryptor.STORAGE.replaceFile(filePath, newPath, combinedBuffer);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @description `[ENG]` Decrypts a file using the secret key and saves it with the original name.
   * @description `[ES]` Descifra un archivo utilizando la clave secreta y lo guarda con el nombre original.
   * @param filePath `string` - The path of the file to be decrypted (read-only).
   */
  decryptFile(filePath: Readonly<string>) {
    try {
      // Read the encrypted file as a buffer
      const encryptedBuffer = Encryptor.STORAGE.getFile(filePath);
      const encryptedBytes = new Uint8Array(encryptedBuffer);

      // Validate the length of the encrypted bytes
      if (encryptedBytes.length < nacl.secretbox.nonceLength) {
        throw new Error("Archivo cifrado inválido: muy corto.");
      }

      // Extract the nonce and ciphertext from the encrypted bytes
      const nonce = encryptedBytes.slice(0, nacl.secretbox.nonceLength);
      const ciphertext = encryptedBytes.slice(nacl.secretbox.nonceLength);

      // Try to decrypt the ciphertext using the secret key and nonce
      const decryptedBytes = nacl.secretbox.open(
        ciphertext,
        nonce,
        Encryptor.SECRET_KEY
      );

      if (!decryptedBytes) {
        throw new Error(
          "No se pudo descifrar el archivo. Verifica la clave o el archivo."
        );
      }

      const originalBuffer = Buffer.from(decryptedBytes);

      // Get the encrypted file name from the path
      const fileName = path.basename(filePath).replace(/\.enc$/, "");
      if (!fileName) {
        throw new Error("No se pudo obtener el nombre del archivo cifrado.");
      }

      // Decrypt the file name using the stored value
      const originalFileName = this.decryptText(
        Encryptor.STORAGE.getByUID(fileName)
      );
      if (!originalFileName) {
        throw new Error("No se pudo descifrar el nombre del archivo.");
      }

      // Generate the restored path for the decrypted file
      const restoredPath = new String(filePath).replace(
        path.basename(filePath),
        originalFileName
      );

      // Save the decrypted file with the original name
      Encryptor.STORAGE.replaceFile(filePath, restoredPath, originalBuffer);

      // Remove the encrypted file from the library
      Encryptor.STORAGE.removeFromLibrary(fileName);
    } catch (error) {
      console.error(`Error al descifrar archivo "${filePath}":`, error);
      throw new Error(
        `Fallo en decryptFile: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export default Encryptor.getInstance();
