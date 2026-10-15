import { buildSite } from "./build.mjs";
import { serve } from "./serve.mjs";
await buildSite();
serve();
