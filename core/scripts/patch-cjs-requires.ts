import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";

async function fixRequires() {
  // Search for all .cjs files in the dist/cjs directory
  const files = await glob("dist/cjs/**/*.cjs");
  for (const file of files) {
    let content = await readFile(file, "utf8");

    // Regex for require statements that do not end with .cjs
    content = content.replace(
      /require\((['"])(\.(?:\.[\/])?[^'"]+?)\1\)/g,
      (_match, quote, relPath) => {
        // If already ends with .cjs, return as is
        if (relPath.endsWith(".cjs")) {
          return `require(${quote}${relPath}${quote})`;
        }
        return `require(${quote}${relPath}.cjs${quote})`;
      }
    );

    await writeFile(file, content, "utf8");
  }
  console.log("✅ Parcheo CJS completado");
}

fixRequires().catch((err) => {
  console.error(err);
  process.exit(1);
});
