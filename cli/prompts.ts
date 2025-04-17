import inquirer from "inquirer";

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
      }:`
    }
  ]);

  return { action, type, path };
}
