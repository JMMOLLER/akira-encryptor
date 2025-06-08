import { readFileSync } from "fs";
import { resolve } from "path";
import pkg from "@yao-pkg/pkg";

// Read package.json to get metadata
const { name, author, version, description } = JSON.parse(
  readFileSync("./package.json", "utf-8")
);

// Build configuration for the executable
const exeName = `${name}-cli-v${version}.exe`;
const outputPath = resolve("cli", "dist", exeName);
const entryFile = resolve("dist", "main.cjs");
const iconPath = resolve("gui", "build", "icon.ico");

try {
  console.log("🔨 Building executable with pkg...");
  await pkg.exec([
    entryFile,
    "--output",
    outputPath,
    "--config",
    "pkg.config.json",
    // "--debug",
  ]);

  console.log("✅ Executable generated successfully.");
} catch (error) {
  console.error("❌ Error during the process:", error.message);
  process.exit(1);
}
