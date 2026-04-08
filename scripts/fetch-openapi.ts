import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const targetDir = path.join(projectRoot, "src", "lib", "api", "generated");
const targetFile = path.join(targetDir, "openapi.json");
const localSpecFile = path.resolve(
  projectRoot,
  "..",
  "eventy-api",
  "internal",
  "docs",
  "openapi.json",
);

async function fetchRemoteSpec(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec from ${url}: ${response.status}`);
  }

  return response.text();
}

async function main() {
  await mkdir(targetDir, { recursive: true });

  const remoteUrl = process.env.EVENTY_OPENAPI_URL;
  const specContents = remoteUrl
    ? await fetchRemoteSpec(remoteUrl)
    : await readFile(localSpecFile, "utf8");

  await writeFile(targetFile, specContents, "utf8");

  console.log(
    `OpenAPI spec ${remoteUrl ? `fetched from ${remoteUrl}` : "copied from eventy-api"} -> ${targetFile}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
