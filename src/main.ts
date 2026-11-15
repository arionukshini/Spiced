import { bootstrap } from "./runtime";
import type { SpicedRuntime } from "./runtime";

const host = window as typeof window & { Spiced?: SpicedRuntime };
const previous = host.Spiced;
if (previous) {
  void previous.dispose().then(() => {
    if (host.Spiced === previous) host.Spiced = bootstrap();
  }).catch(error => console.error("[Spiced] Could not replace previous instance", error));
} else {
  host.Spiced = bootstrap();
}
