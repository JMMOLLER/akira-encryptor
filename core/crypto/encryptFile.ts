import generateNonce from "../crypto/generateNonce";
import { FileSystem } from "../libs/FileSystem";
import { pipeline, Transform } from "stream";
import sodium from "libsodium-wrappers";
import { promisify } from "util";

interface FileEncryptionProps {
  filePath: Readonly<string>;
  onProgress: (processedBytes: number) => void;
  enableLogging?: boolean;
  SECRET_KEY: Uint8Array;
  tempPath: string;
}

const pipelineAsync = promisify(pipeline);
const FS = FileSystem.getInstance();

/**
 * @description `[ENG]` Encrypts a file using the secret key and saves it with a new name.
 * @description `[ES]` Cifra un archivo utilizando la clave secreta y lo guarda con un nuevo nombre.
 * @param filePath `string` - The path of the file to be encrypted (read-only).
 * @param onProgress `ProgressCallback` - Optional callback function to track progress.
 * @param saveOnEnd `boolean` - Optional flag to save the encrypted file in storage.
 */
async function encryptFile(props: FileEncryptionProps): Promise<void> {
  const { filePath, onProgress, tempPath, SECRET_KEY } = props;

  // Streams for reading and writing file
  const rs = FS.createReadStream(filePath);
  const ws = FS.createWriteStream(tempPath);

  // If logging is enabled, create a write stream for logging
  let log: ReturnType<typeof FS.createWriteStream> | null = null;
  let chunkCount = 0;
  if (props.enableLogging) {
    log = FS.createWriteStream(filePath + ".enc.log");
    log.write(`🟢 Inicio de cifrado: ${filePath}\n`);
    log.write(`Tamaño total: ${FS.getStatFile(filePath).size} bytes\n`);
  }

  // Transform stream to handle encryption
  const encryptStream = new Transform({
    async transform(chunk, _enc, cb) {
      try {
        chunkCount++;
        const nonce = await generateNonce();
        const chunkBuf = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as string);
        const encrypted = sodium.crypto_secretbox_easy(
          chunkBuf,
          nonce,
          SECRET_KEY
        );

        // Prepare the output - buffer with nonce + length + data
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(encrypted.length, 0);
        const out = Buffer.concat([
          Buffer.from(nonce),
          lenBuf,
          Buffer.from(encrypted)
        ]);

        // Send the progress
        onProgress?.(chunkBuf.length);

        // Write to the writable stream logging
        if (log) {
          log.write(`📦 Chunk #${chunkCount}\n`);
          log.write(` - Nonce: ${Buffer.from(nonce).toString("hex")}\n`);
          log.write(` - Encrypted Length: ${Buffer.from(encrypted).length}\n`);
        }

        cb(null, out);
      } catch (err) {
        cb(err as Error);
      }
    }
  });

  // This call handles the piping of the read stream to the encrypt stream and then to the write stream
  await pipelineAsync(rs, encryptStream, ws);

  // Ensure the write stream logging is closed
  if (log) {
    log.end(`✅ Cifrado completado: ${filePath}\n`);
    await new Promise<void>((resolve) => log.on("close", resolve));
  }
}

export default encryptFile;
