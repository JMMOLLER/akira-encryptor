import type { ProgressCallback } from "types";
import formatBytes from "@utils/formatBytes";
import EncryptorClass from "@libs/Encryptor";
import cliProgress from "cli-progress";
import path from "path";
import fs from "fs";

type HanlderProps = {
  action: CliAction;
  filePath: string;
  password: string;
};

async function handleFileAction(props: HanlderProps) {
  const { action, filePath, password } = props;

  const progressBar = new cliProgress.SingleBar(
    {
      format:
        "Archivo actual |{bar}| {percentage}% || {processed}/{formattedTotal}"
    },
    cliProgress.Presets.shades_classic
  );

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const formattedTotal = formatBytes(total);
  let init = false;

  const handleProgress: ProgressCallback = (processed) => {
    if (!init) {
      progressBar.start(total, 0, {
        processed: formatBytes(0),
        formattedTotal
      });
      init = true;
    }

    progressBar.update(processed, {
      processed: formatBytes(processed),
      formattedTotal
    });

    if (processed >= total) {
      progressBar.stop();
      console.log(
        `✅ Archivo '${filePath}' ${
          action === "encrypt" ? "encriptado" : "desencriptado"
        } correctamente.`
      );
    }
  };

  try {
    const Encryptor = await EncryptorClass.init(password);

    if (action === "encrypt") {
      await Encryptor.encryptFile({
        filePath: path.normalize(filePath),
        onProgress: handleProgress
      });
    } else {
      await Encryptor.decryptFile({
        filePath: path.normalize(filePath),
        onProgress: handleProgress
      });
    }
  } catch (error) {
    progressBar.stop();
    console.error(`\n❌ Error al procesar el archivo:\n`, error);
    process.exit(1);
  }
}

export default handleFileAction;
