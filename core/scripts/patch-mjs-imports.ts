import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";

async function fixImports() {
  // Search for all .cjs files in the dist/cjs directory
  const files = await glob("dist/esm/**/*.js");
  for (const file of files) {
    let content = await readFile(file, "utf8");

    // Regex for require statements that do not end with .cjs
    content = content.replace(
      /import\s+[^'"]+['"](\.(?:\.[\/])?[^'"]+)['"]/g,
      (match) => {
        return match.replace(
          /(['"])(\.(?:\.[\/])?[^'"]+)(['"])/,
          (_m, q1, relPath, q2) => {
            if (relPath.endsWith(".js")) {
              return `${q1}${relPath}${q2}`;
            }
            return `${q1}${relPath}.js${q2}`;
          }
        );
      }
    );

    await writeFile(file, content, "utf8");
  }
  console.log("✅ Parcheo ESM completado");
}

fixImports().catch((err) => {
  console.error(err);
  process.exit(1);
});
