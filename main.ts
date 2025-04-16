import Encryptor from "@libs/Encryptor";
import cliProgress from "cli-progress";
import inquirer from "inquirer";
import fs from "fs";

async function main() {
  const { action } = await inquirer.prompt([
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

  const { type } = await inquirer.prompt([
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

  if (type === "folder") {
    console.log("Funcionalidad aún no implementada.");
    return;
  }

  const { path } = await inquirer.prompt([
    {
      type: "input",
      name: "path",
      message: `Ruta del archivo a ${
        action === "encrypt" ? "encriptar" : "desencriptar"
      }:`
    }
  ]);

  if (!fs.existsSync(path) || !fs.lstatSync(path).isFile()) {
    console.error("El archivo especificado no existe o no es válido.");
    return;
  }

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  const stat = fs.statSync(path);
  let init = false;
  const handleProgress: ProgressCallback = (processed, total) => {
    progressBar.update(processed);
    if (!init) {
      progressBar.start(stat.size, 0);
      init = true;
    }
    if (processed >= total) {
      progressBar.stop();
      console.log(
        `✅ Archivo '${path}' ${
          action === "encrypt" ? "encriptado" : "desencriptado"
        } correctamente.`
      );
    }
  };

  try {
    if (action === "encrypt") {
      Encryptor.encryptFile(path, handleProgress);
    } else {
      Encryptor.decryptFile(path, handleProgress);
    }
  } catch (error) {
    progressBar.stop();
    console.error(
      `❌ Error al ${
        action === "encrypt" ? "encriptar" : "desencriptar"
      } el archivo:`,
      error
    );
  }
}

main();
