import { installBundle, printActivationInstructions } from "./paths.mjs";

try {
  const destination = await installBundle();
  console.log(`Installed Spiced: ${destination}`);
  printActivationInstructions();
} catch (error) {
  console.error(`[Spiced install] ${error.message}`);
  console.error("Run npm run build first, and confirm your Spicetify Extensions directory is writable.");
  process.exitCode = 1;
}
