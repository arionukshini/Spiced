import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectDir = fileURLToPath(new URL("../", import.meta.url));
export const bundlePath = path.join(projectDir, "dist", "spiced.js");

function cliPath(args) {
  const output = execFileSync("spicetify", args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = output.replace(/\u001b\[[0-9;]*m/g, "").trim().split(/\r?\n/);
  const result = lines.find((line) => path.isAbsolute(line.trim()));
  if (!result) throw new Error(`Spicetify returned no absolute path for ${args.join(" ")}.`);
  return result.trim();
}

export function getExtensionsDir() {
  if (process.env.SPICED_EXTENSIONS_DIR?.trim()) {
    return path.resolve(process.env.SPICED_EXTENSIONS_DIR);
  }

  try {
    // The CLI's root can point to built-ins; custom extensions belong beside its config.
    return path.join(path.dirname(cliPath(["-c"])), "Extensions");
  } catch (configError) {
    try {
      return cliPath(["path", "-e", "root"]);
    } catch {
      throw new Error(
        "Cannot locate Spicetify. Add spicetify to PATH or set SPICED_EXTENSIONS_DIR to your Extensions folder.",
        { cause: configError },
      );
    }
  }
}

export async function atomicWrite(destination, contents) {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, contents);
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function installBundle(directory = getExtensionsDir(), contents) {
  const destination = path.join(directory, "spiced.js");
  const bundle = contents ?? await readFile(bundlePath);
  await atomicWrite(destination, bundle);
  return destination;
}

export function printActivationInstructions() {
  console.log("Enable once, then apply in PowerShell:");
  console.log("  spicetify config extensions spiced.js");
  console.log("  spicetify apply");
  console.log("Existing extensions are preserved. Applying may restart Spotify.");
}
