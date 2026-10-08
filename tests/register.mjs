import { registerHooks } from "node:module";

// CSS has no behavior during server-rendered component tests.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "export default {};", shortCircuit: true };
    return nextLoad(url, context);
  },
});
