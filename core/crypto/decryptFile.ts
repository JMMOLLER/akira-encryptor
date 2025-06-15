import { FileSystem } from "../libs/FileSystem";
import sodium from "libsodium-wrappers";
import type { Writable } from "stream";

const FS = FileSystem.getInstance();

interface FileDecryptionProps {
  filePath: Readonly<string>;
  enableLogging?: boolean;
  blockSize: number;
  onProgress: (processedBytes: number) => void;
  SECRET_KEY: Uint8Array;
  tempPath: string;
}

async function decryptFile(props: FileDecryptionProps): Promise<void> {
  const { filePath, onProgress, blockSize, tempPath } = props;

  await sodium.ready;
  const readStream = FS.createReadStream(filePath, blockSize);
  const writeStream = FS.createWriteStream(tempPath);

  const logStream = props.enableLogging
    ? FS.createWriteStream(filePath + ".dec.log")
    : undefined;

  /**
   * @description `[ESP]` - `leftover` es un buffer que almacena los datos que no se procesan hasta completar el bloque.
   * @description `[ENG]` - `leftover` is a buffer that stores data that is not processed until the block is complete.
   */
  let leftover = Buffer.alloc(0);

  return new Promise((resolve, reject) => {
    let chunkCount = 0;
    if (logStream) {
      const fileStats = FS.getStatFile(filePath);
      logStream.write(`🟢 Inicio de decifrado: ${filePath}\n`);
      logStream.write(`Tamaño total: ${fileStats.size} bytes\n`);
    }

    readStream.on("data", async (chunk) => {
      chunkCount++;
      leftover = await onDecryptReadStream({
        writeStream,
        leftover,
        onProgress,
        chunk,
        reject,
        tempPath,
        chunkCount,
        logStream,
        SECRET_KEY: props.SECRET_KEY,
        nonceLength: sodium.crypto_secretbox_NONCEBYTES,
        macLength: sodium.crypto_secretbox_MACBYTES
      });
    });

    readStream.on("end", () => {
      if (logStream) {
        logStream.end(`✅ Decifrado completado: ${filePath}\n`);
      }
      writeStream.end();
    });

    readStream.on("error", async (error) => {
      await onDecryptStreamError({
        streamName: "readStream",
        reject,
        tempPath,
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

    writeStream.on("error", async (error) => {
      await onDecryptStreamError({
        streamName: "writeStream",
        tempPath,
        reject,
        error
      });
    });
  });
}

interface ReadStreampProps {
  chunk: string | Uint8Array;
  writeStream: Writable;
  onProgress: (processedBytes: number) => void;
  reject: (error?: any) => void;
  tempPath: string;
  SECRET_KEY: Uint8Array;
  leftover: Buffer<ArrayBuffer>;
  nonceLength: number;
  macLength: number;
  logStream?: Writable;
  chunkCount?: number;
}

async function onDecryptReadStream(
  params: ReadStreampProps
): Promise<Buffer<ArrayBuffer>> {
  const { chunk, writeStream, tempPath, nonceLength, macLength } = params;
  let { leftover } = params;

  const chunkArray =
    typeof chunk === "string"
      ? sodium.from_string(chunk)
      : new Uint8Array(chunk);
  leftover = Buffer.concat([leftover, chunkArray]);

  while (leftover.length >= nonceLength + 4 + macLength) {
    try {
      const chunkNonce = leftover.subarray(0, nonceLength);
      const lengthBuffer = leftover.subarray(nonceLength, nonceLength + 4);
      const encryptedLength = lengthBuffer.readUInt32BE(0);

      if (leftover.length < nonceLength + 4 + encryptedLength) {
        break;
      }

      const encryptedChunk = leftover.subarray(
        nonceLength + 4,
        nonceLength + 4 + encryptedLength
      );

      leftover = leftover.subarray(nonceLength + 4 + encryptedLength);

      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedChunk,
        chunkNonce,
        params.SECRET_KEY
      );

      if (!decrypted) {
        throw new Error("Error al descifrar un bloque del archivo.");
      }

      writeStream.write(Buffer.from(decrypted));

      if (params.logStream && !params.logStream.closed) {
        params.logStream.write(`📦 Chunk #${params.chunkCount}\n`);
        params.logStream.write(
          ` - Nonce: ${Buffer.from(chunkNonce).toString("hex")}\n`
        );
        params.logStream.write(` - Encrypted Length: ${encryptedLength}\n`);
      }

      params.onProgress?.(nonceLength + 4 + encryptedLength);
    } catch (err) {
      if (tempPath) await FS.removeFile(tempPath);
      params.reject(err);
    }
  }

  return leftover;
}

async function onDecryptStreamError(params: DecryptStreamError) {
  const { reject, error, tempPath, logStream } = params;

  if (tempPath) await FS.removeFile(tempPath);
  if (logStream) {
    logStream.end(`❌ Error al cifrar chunk: ${(error as Error).message}\n`);
  }
  reject(error);
}

export default decryptFile;
