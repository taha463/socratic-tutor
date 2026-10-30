import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  const { parentURL = "" } = context;

  if (specifier.startsWith(".") && parentURL.startsWith("file:")) {
    const parentDir = path.dirname(fileURLToPath(parentURL));
    const targetPath = path.resolve(parentDir, specifier);

    // Try .ts
    if (fs.existsSync(targetPath + ".ts")) {
      return {
        url: pathToFileURL(targetPath + ".ts").href,
        shortCircuit: true,
      };
    }

    // Try /index.ts
    if (fs.existsSync(path.join(targetPath, "index.ts"))) {
      return {
        url: pathToFileURL(path.join(targetPath, "index.ts")).href,
        shortCircuit: true,
      };
    }
  }

  // Handle @/ path alias
  if (specifier.startsWith("@/")) {
    const targetPath = path.resolve(process.cwd(), specifier.slice(2));
    if (fs.existsSync(targetPath + ".ts")) {
      return {
        url: pathToFileURL(targetPath + ".ts").href,
        shortCircuit: true,
      };
    }
    if (fs.existsSync(path.join(targetPath, "index.ts"))) {
      return {
        url: pathToFileURL(path.join(targetPath, "index.ts")).href,
        shortCircuit: true,
      };
    }
  }

  return nextResolve(specifier, context);
}

