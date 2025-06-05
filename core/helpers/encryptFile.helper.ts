import generateNonce from "core/crypto/generateNonce";
import type { Readable, Writable } from "stream";
import { FileSystem } from "@libs/FileSystem";
import sodium from "libsodium-wrappers";

interface FileEncryptionProps {
  filePath: Readonly<string>;
  onProgress: (processedBytes: number) => void;
  SECRET_KEY: Uint8Array;
  tempPath: string;
}

const FS = FileSystem.getInstance();

/**
 * @description `[ENG]` Encrypts a file using the secret key and saves it with a new name.
 * @description `[ES]` Cifra un archivo utilizando la clave secreta y lo guarda con un nuevo nombre.
 * @param filePath `string` - The path of the file to be encrypted (read-only).
 * @param onProgress `ProgressCallback` - Optional callback function to track progress.
 * @param saveOnEnd `boolean` - Optional flag to save the encrypted file in storage.
 */
async function encryptFile(props: FileEncryptionProps): Promise<void> {
  const { filePath, onProgress, tempPath } = props;

  const readStream = FS.createReadStream(filePath);

  const writeStream = FS.createWriteStream(tempPath);

  return new Promise((resolve, reject) => {
    readStream.on("data", (chunk) =>
      onEncryptReadStream({
        readStream,
        writeStream,
        onProgress,
        SECRET_KEY: props.SECRET_KEY,
        reject,
        chunk
      })
    );

    readStream.on("end", () => {
      writeStream.end();
    });

    readStream.on("error", async (error) => {
      await onEncryptReadStreamError({
        writeStream,
        tempPath,
        reject,
        error
      });
    });

    writeStream.once("finish", () => {
      resolve();
    });
  });
}

interface ReadStreamProps {
  chunk: Buffer | string;
  tempPath?: string;
  SECRET_KEY: Uint8Array;
  reject: (error?: any) => void;
  writeStream: Writable;
  readStream: Readable;
  onProgress: (processedBytes: number) => void;
}

async function onEncryptReadStream(params: ReadStreamProps) {
  const { readStream, writeStream, tempPath } = params;
  const { chunk, onProgress, reject } = params;
  try {
    const nonce = generateNonce();
    const chunkArray =
      typeof chunk === "string"
        ? sodium.from_string(chunk)
        : new Uint8Array(chunk);
    const encryptedChunk = sodium.crypto_secretbox_easy(
      chunkArray,
      nonce,
      params.SECRET_KEY
    );

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(encryptedChunk.length, 0);

    writeStream.write(Buffer.from(nonce));
    writeStream.write(lenBuf);
    writeStream.write(Buffer.from(encryptedChunk));

    onProgress?.(chunk.length);
  } catch (err) {
    readStream.destroy();
    writeStream.destroy();
    if (tempPath) await FS.removeFile(tempPath);
    return reject(err);
  }
}

async function onEncryptReadStreamError(params: EncryptReadStreamError) {
  const { writeStream, reject, error, tempPath } = params;
  writeStream.destroy();
  if (tempPath) await FS.removeFile(tempPath);
  reject(error);
}

export default encryptFile;
