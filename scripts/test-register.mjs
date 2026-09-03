/** Installs the "@/..." alias resolver used by `npm test`. */
import { register } from "node:module";
register("./test-alias-hook.mjs", import.meta.url);
