import handleFolderAction from "@cli/handlers/folderHandler";
import handleFileAction from "@cli/handlers/fileHandler";
import { askUserActions } from "@cli/prompts";
import fs from "fs";

async function main() {
  const { action, type, path, password } = await askUserActions();

  if (
    (type === "file" &&
      (!fs.existsSync(path) || !fs.statSync(path).isFile())) ||
    (type === "folder" &&
      (!fs.existsSync(path) || !fs.statSync(path).isDirectory()))
  ) {
    console.error("\n❌ La ruta especificada no es válida.");
    process.exit(1);
  }

  try {
    if (type === "file") {
      await handleFileAction({ action, filePath: path, password });
    } else {
      await handleFolderAction({ action, folderPath: path, password });
    }
  } catch (err) {
    console.error(`\n❌ Error inesperado:\n`, err);
    process.exit(1);
  }
}

main();
