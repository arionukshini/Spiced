import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { projectDir, bundlePath } from "./paths.mjs";
import path from "node:path";

const routes = new Map([
  ["/", [path.join(projectDir, "tests", "fixtures", "spotify.html"), "text/html"]],
  ["/dist/spiced.js", [bundlePath, "text/javascript"]],
]);

createServer(async (request, response) => {
  const route = routes.get(new URL(request.url, "http://127.0.0.1").pathname);
  if (!route) { response.writeHead(404).end(); return; }
  try {
    response.writeHead(200, { "Content-Type": `${route[1]}; charset=utf-8`, "Cache-Control": "no-store" });
    response.end(await readFile(route[0]));
  } catch {
    response.writeHead(500).end("Run npm run build first.");
  }
}).listen(8137, "127.0.0.1", () => {
  console.log("Spiced settings harness: http://127.0.0.1:8137 (mock APIs, not Spotify). Ctrl+C to stop.");
});
