import { FileSystem } from "@libs/FileSystem";
import { env } from "@configs/env";
import inquirer from "inquirer";
import fs from "fs";

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

  const { path } = await inquirer.prompt<{ path: string }>([
    {
      type: "input",
      name: "path",
      message: `Ruta de ${type === "folder" ? "la carpeta" : "el archivo"} a ${
        action === "encrypt" ? "encriptar" : "desencriptar"
      }:`,
      validate: (input) => {
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
