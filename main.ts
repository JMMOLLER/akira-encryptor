import handleFolderAction from "@cli/folderHandler";
import handleFileAction from "@cli/fileHandler";
import { askUserActions } from "./cli/prompts";
import fs from "fs";

async function main() {
  const { action, type, path } = await askUserActions();

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
      await handleFileAction(action, path);
    } else {
      await handleFolderAction(action, path);
    }
  } catch (err) {
    console.error(`\n❌ Error inesperado:\n`, err);
    process.exit(1);
  }
}

main();
