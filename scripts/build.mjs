import * as esbuild from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  atomicWrite,
  bundlePath,
  getExtensionsDir,
  installBundle,
  printActivationInstructions,
  projectDir,
} from "./paths.mjs";

const args = new Set(process.argv.slice(2));
for (const arg of args) {
  if (arg !== "--watch" && arg !== "--install") {
    throw new Error(`Unknown build option: ${arg}`);
  }
}

const watch = args.has("--watch");
const install = args.has("--install");
const metadata = JSON.parse(await readFile(path.join(projectDir, "package.json"), "utf8"));

try {
  const extensionsDir = install ? getExtensionsDir() : undefined;
  const options = {
    absWorkingDir: projectDir,
    entryPoints: ["src/main.ts"],
    outfile: bundlePath,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    charset: "utf8",
    loader: { ".css": "text" },
    minify: !watch,
    sourcemap: watch ? "inline" : false,
    define: {
      __DEV__: JSON.stringify(watch),
      __VERSION__: JSON.stringify(metadata.version),
    },
    write: false,
    logLevel: "info",
    plugins: [{
      name: "publish-successful-build",
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length > 0) return;
          const output = result.outputFiles?.find((file) => file.path === bundlePath);
          if (!output) return { errors: [{ text: "Build produced no spiced.js bundle." }] };
          try {
            await atomicWrite(bundlePath, output.contents);
            console.log(`Built dist/spiced.js (${(output.contents.length / 1024).toFixed(1)} KiB).`);
            if (install) {
              const destination = await installBundle(extensionsDir, output.contents);
              console.log(`Copied Spiced to ${destination}`);
              if (watch) console.log("Spicetify watch -e will refresh Spotify when this file changes.");
            }
          } catch (error) {
            return { errors: [{ text: `Could not publish bundle: ${error.message}` }] };
          }
        });
      },
    }],
  };

  if (watch) {
    const context = await esbuild.context(options);
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true;
      await context.dispose();
      process.exit(0);
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await context.watch();
    console.log("Watching source files. Press Ctrl+C to stop.");
    if (install) {
      printActivationInstructions();
      console.log("After initial activation, run spicetify watch -e in another terminal for reloads.");
    }
  } else {
    await esbuild.build(options);
    if (install) printActivationInstructions();
  }
} catch (error) {
  console.error(`[Spiced build] ${error.message}`);
  process.exitCode = 1;
}
