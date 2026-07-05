import { cp, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDataDir = path.join(rootDir, "dist", "data");

async function main() {
  await mkdir(distDataDir, { recursive: true });
  await copyFile(path.join(rootDir, "data", "brands.json"), path.join(distDataDir, "brands.json"));
  await copyFile(path.join(rootDir, "data", "icon-index.json"), path.join(distDataDir, "icon-index.json"));
  await cp(path.join(rootDir, "data", "icons"), path.join(distDataDir, "icons"), {
    recursive: true,
    force: true,
    errorOnExist: false
  }).catch((error) => {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  });

  console.log("[build:site-data] Copied data files to dist/data.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
