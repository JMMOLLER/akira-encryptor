import generateNonce from "../crypto/generateNonce";
import type { Readable, Writable } from "stream";
import { FileSystem } from "../libs/FileSystem";
import sodium from "libsodium-wrappers";

interface FileEncryptionProps {
  filePath: Readonly<string>;
  onProgress: (processedBytes: number) => void;
  enableLogging?: boolean;
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

  const logStream = props.enableLogging
    ? FS.createWriteStream(filePath + ".enc.log")
    : undefined;

  return new Promise((resolve, reject) => {
    let chunkCount = 0;
    if (logStream) {
      const fileStats = FS.getStatFile(filePath);
      logStream.write(`🟢 Inicio de cifrado: ${filePath}\n`);
      logStream.write(`Tamaño total: ${fileStats.size} bytes\n`);
    }

    readStream.on("data", async (chunk) => {
      chunkCount++;
      await onEncryptReadStream({
        SECRET_KEY: props.SECRET_KEY,
        chunkCount,
        readStream,
        writeStream,
        onProgress,
        logStream,
        tempPath,
        reject,
        chunk
      });
    });

    readStream.on("end", () => {
      if (logStream) {
        logStream.end(`✅ Cifrado completado: ${filePath}\n`);
      }
      writeStream.end();
    });

    readStream.on("error", async (error) => {
      await onEncryptReadStreamError({
        writeStream,
        logStream,
        tempPath,
        reject,
        error
      });
    });

    writeStream.once("finish", async () => {
      if (logStream) {
        await new Promise<void>((res) => {
          logStream.on("close", res);
        });
      }
      resolve();
    });
  });
}

interface ReadStreamProps {
  chunk: Buffer | string;
  tempPath: string;
  SECRET_KEY: Uint8Array;
  reject: (error?: any) => void;
  writeStream: Writable;
  readStream: Readable;
  logStream?: Writable;
  chunkCount?: number;
  onProgress: (processedBytes: number) => void;
}

async function onEncryptReadStream(params: ReadStreamProps) {
  const { readStream, writeStream, tempPath, logStream } = params;
  const { chunk, onProgress, reject } = params;
  try {
    const nonce = await generateNonce();
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

    const nonceBuffer = Buffer.from(nonce);
    writeStream.write(nonceBuffer);
    writeStream.write(lenBuf);
    writeStream.write(Buffer.from(encryptedChunk));

    if (logStream) {
      logStream.write(`📦 Chunk #${params.chunkCount}\n`);
      logStream.write(` - Nonce: ${nonceBuffer.toString("hex")}\n`);
      logStream.write(` - Encrypted Length: ${encryptedChunk.length}\n`);
    }

    onProgress?.(chunk.length);
  } catch (err) {
    readStream.destroy();
    writeStream.destroy();
    if (tempPath) await FS.removeFile(tempPath);
    return reject(err);
  }
}

async function onEncryptReadStreamError(params: EncryptReadStreamError) {
  const { writeStream, reject, error, tempPath, logStream } = params;
  writeStream.destroy();
  if (tempPath) await FS.removeFile(tempPath);
  if (logStream) {
    logStream.end(`❌ Error al cifrar chunk: ${(error as Error).message}\n`);
  }
  reject(error);
}

export default encryptFile;
