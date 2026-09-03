/**
 * Resolves the project's "@/..." TypeScript path alias for `node --test`.
 *
 * Node runs the .ts sources directly (type stripping), but it does not read
 * tsconfig "paths", and ESM has no directory/extension resolution -- so
 * "@/lib/filter-activity" and "@/types" both need help. This maps the alias
 * to src/ and then tries the same candidates tsc would: the exact path, then
 * .ts, then /index.ts. Test-only; nothing here ships in the build.
 */
import { statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(fileURLToPath(import.meta.url), "../../src");

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

export async function resolve(specifier, context, next) {
  if (!specifier.startsWith("@/")) return next(specifier, context);

  const base = path.join(SRC, specifier.slice(2));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  const match = candidates.find(isFile);

  return next(match ? pathToFileURL(match).href : specifier, context);
}
