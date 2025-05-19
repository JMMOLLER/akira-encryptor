import normalizePath from "@utils/normalizePath";
import { FileSystem } from "@libs/FileSystem";
import Encryptor from "@libs/Encryptor";
import { env } from "@configs/env";
import inquirer from "inquirer";
import fs from "fs";

interface HidePromptOptions {
  actionFor: CliType;
  Encryptor: Encryptor;
  item: FileItem | FolderItem;
}

export async function askForHideItem(props: HidePromptOptions) {
  const { actionFor, Encryptor, item } = props;
  const { hide } = await inquirer.prompt<{ hide: boolean }>([
    {
      type: "confirm",
      name: "hide",
      message: `¿Desea ocultar ${
        actionFor === "file" ? "el archivo" : "la carpeta"
      }`,
      default: false
    }
  ]);
  if (hide) {
    await Encryptor.hideStoredItem(item.id);
  }
}

export async function askForOtherOperation() {
  process.stdout.write("\n");
  const { exit } = await inquirer.prompt([
    {
      type: "confirm",
      name: "exit",
      message: "¿Desea realizar otra operación?",
      default: false
    }
  ]);
  return !exit;
}

// Note: If you enter an incorrect password, you will have to restart the program
let password: string | undefined = env.PASSWORD;

export async function askUserActions() {
  const { action } = await inquirer.prompt<{ action: CliAction }>([
    {
      type: "list",
      name: "action",
      message: "¿Qué desea realizar?",
      choices: [
        { name: "Encriptar", value: "encrypt" },
        { name: "Desencriptar", value: "decrypt" }
      ]
    }
  ]);

  const { type } = await inquirer.prompt<{ type: CliType }>([
    {
      type: "list",
      name: "type",
      message: `¿Qué desea ${
        action === "encrypt" ? "encriptar" : "desencriptar"
      }?`,
      choices: [
        { name: "Carpeta", value: "folder" },
        { name: "Archivo", value: "file" }
      ]
    }
  ]);

  let path: string = "";

  if (password && action === "decrypt") {
    const encryptor = await Encryptor.init(password, {
      minDelayPerStep: 0,
      silent: true
    });
    const storage = encryptor.getStorage();
    const values = Array.from(storage.values());
    const choices = values
      .filter((item) => item.type === type)
      .map((item) => {
        const named = item.isHidden ? "." + item.id : item.id;
        return {
          name: item.path + (item.isHidden ? " (*)" : ""),
          value: item.path.replace(
            item.originalName!,
            item.type === "folder" ? named : named + ".enc"
          )
        };
      });

    if (choices.length > 0) {
      // I think this last choice is not needed, but I will leave it here for now 🤔
      choices.push({ value: "Otra ruta...", name: "Otra ruta..." });

      // Prompt the user to select a path
      let { selectedPath } = await inquirer.prompt<{ selectedPath: string }>([
        {
          type: "list",
          name: "selectedPath",
          message: `Seleccione el elemento que desea desencriptar:`,
          choices
        }
      ]);
      path = selectedPath;
    }
  }

  if (!path || path === "Otra ruta...") {
    let { digitedPath } = await inquirer.prompt<{ digitedPath: string }>([
      {
        type: "input",
        name: "digitedPath",
        message: `Ruta de ${
          type === "folder" ? "la carpeta" : "el archivo"
        } a ${action === "encrypt" ? "encriptar" : "desencriptar"}:`,
        filter: normalizePath,
        validate: (v) => {
          const input = normalizePath(v);

          if (!fs.existsSync(input)) {
            return "La ruta especificada no existe.";
          }
          if (type === "folder" && !fs.statSync(input).isDirectory()) {
            return "La ruta especificada no es una carpeta.";
          }
          if (type === "file" && !fs.statSync(input).isFile()) {
            return "La ruta especificada no es un archivo.";
          }
          return true;
        }
      }
    ]);
    path = digitedPath;
  }

  if (!password) {
    const storeExists = FileSystem.getInstance().fileExists(env.LIBRARY_PATH);
    const { password: pwd } = await inquirer.prompt<{ password: string }>([
      {
        type: "password",
        name: "password",
        message: `${
          action === "encrypt" && !storeExists ? "Cree una" : "Ingrese la"
        } contraseña:`,
        mask: "*",
        validate: (input) => {
          if (input.length < 4) {
            return "La contraseña debe tener al menos 4 caracteres.";
          }
          return true;
        }
      }
    ]);
    password = pwd;
  }

  return { action, type, path, password };
}
