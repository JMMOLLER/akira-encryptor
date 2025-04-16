import generateSecretKey from "@utils/generateSecretKey";
import { FileSystem } from "./FileSystem";
import sodium from "libsodium-wrappers";
import { env } from "@configs/env";
import path from "path";

class Encryptor {
  private static SECRET_KEY: Uint8Array;
  private static readonly ENCODING = env.ENCODING as BufferEncoding;
  private static readonly STORAGE = FileSystem.getInstance();
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
    const cipher = sodium.crypto_secretbox_easy(textBytes, nonce, Encryptor.SECRET_KEY);

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
    const combined = new Uint8Array(Buffer.from(encryptedText, Encryptor.ENCODING));

    // Get the nonce and cipher from the combined array
    const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const cipher = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

    // Decrypt the cipher using the nonce and secret key
    const decrypted = sodium.crypto_secretbox_open_easy(cipher, nonce, Encryptor.SECRET_KEY);
    if (!decrypted) return null;

    return sodium.to_string(decrypted);
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
        const decryptedMsg = this.decryptText(mensajeCifrado);
        console.log(`ID: ${id}, Mensaje: ${decryptedMsg || "Mensaje no válido"}`);
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
    // Convert the file to bytes
    const fileBuffer = Encryptor.STORAGE.getFile(filePath);
    const fileUint8 = new Uint8Array(fileBuffer);

    // Generate a nonce and encrypt the file
    const nonce = this.generateNonce();
    const encrypted = sodium.crypto_secretbox_easy(fileUint8, nonce, Encryptor.SECRET_KEY);

    // Combine the nonce and encrypted data into a single Uint8Array
    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);

    // Convert the combined Uint8Array to a Buffer and save it with a new name
    const combinedBuffer = Buffer.from(combined);
    const fileName = path.basename(filePath);
    const encryptedName = this.encryptText(fileName);
    const newFileName = Encryptor.STORAGE.add(encryptedName);
    const newPath = filePath.replace(fileName, `${newFileName}.enc`);

    Encryptor.STORAGE.replaceFile(filePath, newPath, combinedBuffer);
  }

  /**
   * @description `[ENG]` Decrypts a file using the secret key and saves it with the original name.
   * @description `[ES]` Descifra un archivo utilizando la clave secreta y lo guarda con el nombre original.
   * @param filePath `string` - The path of the file to be decrypted (read-only).
   */
  decryptFile(filePath: Readonly<string>) {
    // Convert the file to bytes
    const encryptedBuffer = Encryptor.STORAGE.getFile(filePath);
    const encryptedBytes = new Uint8Array(encryptedBuffer);

    // Check if the file is too short to be valid
    if (encryptedBytes.length < sodium.crypto_secretbox_NONCEBYTES) {
      throw new Error("Archivo cifrado inválido: muy corto.");
    }

    // Get the nonce and ciphertext from the encrypted bytes
    const nonce = encryptedBytes.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = encryptedBytes.slice(sodium.crypto_secretbox_NONCEBYTES);

    // Decrypt the ciphertext using the nonce and secret key
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, Encryptor.SECRET_KEY);
    if (!decrypted) {
      throw new Error("No se pudo descifrar el archivo.");
    }

    // Get the original file name from the encrypted file name
    const originalBuffer = Buffer.from(decrypted);
    const fileName = path.basename(filePath).replace(/\.enc$/, "");
    const encryptedFileName = Encryptor.STORAGE.getByUID(fileName);

    // Check if the encrypted file name is valid
    const originalFileName = this.decryptText(encryptedFileName);
    if (!originalFileName) {
      throw new Error("No se pudo descifrar el nombre del archivo.");
    }

    // Restore the original file name and save the decrypted file
    const restoredPath = filePath.replace(path.basename(filePath), originalFileName);
    Encryptor.STORAGE.replaceFile(filePath, restoredPath, originalBuffer);
    Encryptor.STORAGE.removeFromLibrary(fileName);
  }
}

export default await Encryptor.getInstance();
