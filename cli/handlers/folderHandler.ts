import collectFileSizes from "@utils/collectFileSizes";
import createBar from "@utils/createProgressBar";
import createSpinner from "@utils/createSpinner";
import type { ProgressCallback } from "types";
import { askForHideItem } from "@cli/prompts";
import formatBytes from "@utils/formatBytes";
import EncryptorClass from "@libs/Encryptor";
import type Encryptor from "@libs/Encryptor";
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

      // Si ya se completó todo el progreso, eliminamos la barra actual
      if (globalProcessed >= totalBytes) {
        multibar.remove(progressBarCurrent);
        process.stdout.write("\n");
      } else {
        progressBarCurrent.setTotal(1);
        progressBarCurrent.update(0);
      }
    }
  };

  const handleEnd: FileEncryptor["onEnd"] = (error) => {
    if (!error) {
      createSpinner(
        `Carpeta '${folderPath}' ${
          action === "encrypt" ? "encriptada" : "desencriptada"
        } correctamente.`
      ).succeed();
    } else {
      createSpinner(
        `Error al ${
          action === "encrypt" ? "encriptar" : "desencriptar"
        } la carpeta '${folderPath}'.`
      ).fail();
    }
  };

  try {
    const Encryptor = await EncryptorClass.init(password);

    if (action === "encrypt") {
      const item = await Encryptor.encryptFolder({
        folderPath: path.normalize(folderPath),
        onProgress: handleProgress,
        onEnd: handleEnd
      });

      // Ask if the user wants to hide the folder
      await askForHideItem({
        actionFor: "folder",
        Encryptor,
        item
      });
    } else {
      // If the folder is hidden, we need to reveal it first
      const resolverdFolderPath = await handleIsHiddenFile(
        folderPath,
        Encryptor
      );

      await Encryptor.decryptFolder({
        folderPath: path.normalize(resolverdFolderPath),
        onProgress: handleProgress,
        onEnd: handleEnd
      });
    }

    progressBarCurrent.stop();
    multibar.stop();
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

async function handleIsHiddenFile(folderPath: string, Encryptor: Encryptor) {
  const storage = Encryptor.getStorage();
  const id = path.basename(folderPath).replace(/^\./, "");
  const item = storage.get(id);

  if (item?.isHidden) {
    const status = await Encryptor.revealStoredItem(item.id);
    if (status) {
      return folderPath.replace(path.basename(folderPath), item.id);
    }
  }

  return folderPath;
}

export default handleFolderAction;
