import createSpinner from "@utils/createSpinner";
import type { ProgressCallback } from "types";
import formatBytes from "@utils/formatBytes";
import EncryptorClass from "@libs/Encryptor";
import cliProgress from "cli-progress";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import { askForHideItem } from "@cli/prompts";

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
    }
  };

  const handleEnd: EncryptorFuncion["onEnd"] = (error) => {
    if (!error) {
      createSpinner(
        `Archivo '${filePath}' ${
          action === "encrypt" ? "encriptado" : "desencriptado"
        } correctamente.`
      ).succeed();
    } else {
      progressBar.stop();
      createSpinner(
        `Error al ${
          action === "encrypt" ? "encriptar" : "desencriptar"
        } el archivo '${filePath}'.`
      ).fail();
    }
  };

  try {
    const Encryptor = await EncryptorClass.init(password);

    if (action === "encrypt") {
      const item = await Encryptor.encryptFile({
        filePath: path.normalize(filePath),
        onProgress: handleProgress,
        onEnd: handleEnd
      });

      // Ask if the user wants to hide the file
      await askForHideItem({
        actionFor: "file",
        Encryptor,
        item
      });
    } else {
      // If the folder is hidden, we need to reveal it first
      const resolvedFilePath = await handleIsHiddenFile(filePath, Encryptor);

      await Encryptor.decryptFile({
        filePath: path.normalize(resolvedFilePath),
        onProgress: handleProgress,
        onEnd: handleEnd
      });
    }
  } catch (error) {
    progressBar.stop();
    console.error(`\n❌ Error al procesar el archivo:\n`, error);
    return;
  }
}

async function handleIsHiddenFile(filePath: string, Encryptor: EncryptorClass) {
  const storage = Encryptor.getStorage();
  const id = path
    .basename(filePath)
    .replace(/^\./, "")
    .replace(/\.enc$/, "");
  const item = storage.get(id);

  if (item?.isHidden) {
    const status = await Encryptor.revealStoredItem(item.id);
    if (status) {
      return filePath.replace(path.basename(filePath), item.id + ".enc");
    }
  }

  return filePath;
}

export default handleFileAction;
