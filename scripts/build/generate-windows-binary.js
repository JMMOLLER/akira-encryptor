import { readFileSync } from "fs";
import { resolve } from "path";
import pkg from "pkg";

// Read package.json to get metadata
const { name, author, version, description } = JSON.parse(
  readFileSync("./package.json", "utf-8")
);

// Build configuration for the executable
const exeName = `${name}-cli-v${version}.exe`;
const outputPath = resolve("cli", "dist", exeName);
const entryFile = resolve("cli", "dist", "main.cjs");
const iconPath = resolve("gui", "build", "icon.ico");

try {
  console.log("🔨 Building executable with pkg...");
  pkg.exec([entryFile, "--target", "node18-win-x64", "--output", outputPath]);

  // console.log("🛠️ Adding metadata with rcedit...");
  // // Modify the executable with rcedit
  // await rcedit("C:/Users/JMMOLLER/.pkg-cache/v3.4/fetched-v18.5.0-win-x64", {
  //   "version-string": {
  //     CompanyName: author,
  //     ProductName: "Akira Encryptor CLI",
  //     FileDescription: description,
  //     LegalCopyright: `Copyright© ${new Date().getFullYear()} ${author}`,
  //     OriginalFilename: exeName
  //   },
  //   "product-version": version,
  //   "file-version": version,
  //   icon: iconPath
  // });

  console.log("✅ Executable generated and updated successfully.");
} catch (error) {
  console.error("❌ Error during the process:", error.message);
  process.exit(1);
}
