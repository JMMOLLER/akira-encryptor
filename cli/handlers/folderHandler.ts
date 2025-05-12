import collectFileSizes from "@utils/collectFileSizes";
import createBar from "@utils/createProgressBar";
import type { ProgressCallback } from "types";
import formatBytes from "@utils/formatBytes";
import EncryptorClass from "@libs/Encryptor";
import cliProgress from "cli-progress";
import path from "path";

type HanlderProps = {
  action: CliAction;
  folderPath: string;
  password: string;
};

async function handleFolderAction(props: HanlderProps) {
  const { action, folderPath, password } = props;

  const totalBytes = collectFileSizes(folderPath);
  let globalProcessed = 0;

  const multibar = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: (options, params, payload) => {
        const percentage = Math.round((params.value / params.total) * 100);
        const valueFormatted = formatBytes(params.value);
        const totalFormatted = formatBytes(params.total);

        const bar = createBar({
          progress: params.progress,
          size: options.barsize ?? 40,
          completeChar: options.barCompleteChar ?? "#",
          incompleteChar: options.barIncompleteChar ?? "-"
        });

        return `${payload.name} |${bar}| ${percentage}% || ${valueFormatted}/${totalFormatted}`;
      }
    },
    cliProgress.Presets.shades_classic
  );

  const progressBarTotal = multibar.create(totalBytes, 0, {
    name: "Progreso total"
  });
  const progressBarCurrent = multibar.create(1, 0, { name: "Archivo actual" });

  const handleProgress: ProgressCallback = (processed, total) => {
    if (progressBarCurrent.getTotal() !== total) {
      progressBarCurrent.setTotal(total);
      progressBarCurrent.update(0);
    }

    progressBarCurrent.update(processed);

    if (processed >= total) {
      globalProcessed += total;
      progressBarTotal.update(globalProcessed);
      progressBarCurrent.setTotal(1);
      progressBarCurrent.update(0);
    }
  };

  try {
    const Encryptor = await EncryptorClass.init(password);

    if (action === "encrypt") {
      await Encryptor.encryptFolder({
        filePath: path.normalize(folderPath),
        onProgress: handleProgress
      });
    } else {
      const storage = Encryptor.getStorage()
      const storedFolderData = storage.get(path.basename(folderPath))
      if (!storedFolderData) {
        throw new Error(`No se encontró la carpeta '${folderPath}' en el almacenamiento.`);
      }

      await Encryptor.decryptFolder({
        filePath: path.normalize(folderPath),
        onProgress: handleProgress
      });
    }

    multibar.stop();
    console.log(
      `\n✅ Carpeta '${folderPath}' ${
        action === "encrypt" ? "encriptada" : "desencriptada"
      } correctamente.`
    );
  } catch (error) {
    multibar.stop();
    console.error(
      `\n❌ Error al ${
        action === "encrypt" ? "encriptar" : "desencriptar"
      } la carpeta:\n`,
      error
    );
    return;
  }
}

export default handleFolderAction;
