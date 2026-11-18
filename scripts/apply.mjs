import { execFileSync } from "node:child_process";
import { installBundle } from "./paths.mjs";

try {
  console.log(`Installed Spiced: ${await installBundle()}`);
  for (const args of [["config", "extensions", "spiced.js"], ["apply"]]) {
    execFileSync("spicetify", args, { stdio: "inherit", windowsHide: true });
  }
  console.log("Applied Spiced. Open profile menu → Spiced settings in Spotify.");
} catch (error) {
  console.error(`[Spiced apply] ${error.message}`);
  process.exitCode = 1;
}
