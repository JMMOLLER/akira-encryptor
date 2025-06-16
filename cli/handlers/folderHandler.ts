import type * as EncryptorType from "@akira-encryptor/core/types";
import * as utils from "@akira-encryptor/core/utils";
import EncryptorClass from "@akira-encryptor/core";
import { workerPath } from "../const/workerPath";
import { askForHideItem } from "../prompts";
import cliProgress from "cli-progress";
import path from "path";

type HanlderProps = {
  action: CliAction;
  folderPath: string;
  password: string;
};

async function handleFolderAction(props: HanlderProps) {
  const { action, folderPath, password } = props;

  let init = false;
  let formattedTotal = "0B";
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        "Progreso total |{bar}| {percentage}% || {processed}/{formattedTotal}"
    },
    cliProgress.Presets.shades_classic
  );

  const handleProgress: EncryptorType.ProgressCallback = (processed, total) => {
    if (!init) {
      formattedTotal = utils.formatBytes(total);
      progressBar.start(total, 0, {
        processed: utils.formatBytes(0),
        formattedTotal
      });
      init = true;
    }

    progressBar.update(processed, {
      processed: utils.formatBytes(processed),
      formattedTotal
    });

    if (processed >= total) {
      progressBar.stop();
    }
  };

  const handleEnd: EncryptorType.FileEncryptor["onEnd"] = (error) => {
    // Fallback to stop the progress bar
    progressBar.stop();
    // Print the success or error message
    if (!error) {
      utils
        .createSpinner(
          `Carpeta '${folderPath}' ${
            action === "encrypt" ? "encriptada" : "desencriptada"
          } correctamente.`
        )
        .succeed();
    } else {
      utils
        .createSpinner(
          `Error al ${
            action === "encrypt" ? "encriptar" : "desencriptar"
          } la carpeta '${folderPath}'.`
        )
        .fail();
    }
  };

  try {
    const Encryptor = await EncryptorClass.init(password, workerPath);

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
  } catch (error) {
    progressBar.stop();
    console.error(
      `\n❌ Error al ${
        action === "encrypt" ? "encriptar" : "desencriptar"
      } la carpeta:\n`,
      error
    );
    return;
  }
}

async function handleIsHiddenFile(
  folderPath: string,
  Encryptor: EncryptorClass
) {
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
