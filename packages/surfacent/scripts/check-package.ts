// The package as npm would ship it: packed (which builds it), installed in an
// empty project, and each entry used the way an app uses it.
//
//   node packages/surfacent/scripts/check-package.ts

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkg = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "surfacent-check-"));
const run = (command: string, args: string[], cwd: string) => execFileSync(command, args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString();
const check = (ok: unknown, what: string) => {
  if (!ok) throw new Error(`✗ ${what}`);
  console.log(`✓ ${what}`);
};

try {
  // The build's log (prepack) comes first, then npm's JSON.
  const packed = run("npm", ["pack", "--json", "--pack-destination", work], pkg);
  const tarball = JSON.parse(packed.slice(packed.search(/^\[/m)))[0] as { filename: string; files: { path: string }[] };
  const files = tarball.files.map((file) => file.path);
  check(["dist/index.js", "dist/index.d.ts", "dist/tailwind.js", "dist/vite.js", "dist/vite.d.ts", "dist/cli.js", "README.md", "LICENSE"].every((file) => files.includes(file)), `packed ${files.length} files`);

  const app = path.join(work, "app");
  fs.mkdirSync(app);
  fs.writeFileSync(path.join(app, "package.json"), JSON.stringify({ name: "check-app", private: true, type: "module" }));
  run("npm", ["install", "--no-audit", "--no-fund", path.join(work, tarball.filename), "tailwindcss@^4", "@tailwindcss/node@^4", "react@^19", "react-dom@^19"], app);

  // `@plugin "surfacent/tailwind"` generates the aspects' CSS.
  const css = `@import "tailwindcss";\n@plugin "surfacent/tailwind";\n`;
  const script = `
    import { compile } from "@tailwindcss/node";
    const compiler = await compile(${JSON.stringify(css)}, { base: process.cwd(), onDependency: () => {} });
    process.stdout.write(compiler.build(["p-4", "rounded-xl"]));
  `;
  const built = run("node", ["--input-type=module", "-e", script], app);
  check(built.includes("[data-surface") && built.includes("--tone-step"), "@plugin \"surfacent/tailwind\" builds the aspects' CSS");

  const vite = run("node", ["--input-type=module", "-e", `const { surfacent } = await import("surfacent/vite"); process.stdout.write(surfacent().name);`], app);
  check(vite === "surfacent:settings", "surfacent() from surfacent/vite");

  const toolbar = run("node", ["--input-type=module", "-e", `const { Surfacent } = await import("surfacent"); process.stdout.write(typeof Surfacent);`], app);
  check(toolbar === "function", "<Surfacent /> from surfacent");

  // `npx surfacent mcp` serves the toolbar's side.
  const port = String(40000 + Math.floor(Math.random() * 10000));
  const server = spawn(path.join(app, "node_modules", ".bin", "surfacent"), ["mcp", "--http-only", "--port", port, "--store", path.join(work, "store.json")], { stdio: "ignore" });
  try {
    let health: { name?: string } | undefined;
    for (let attempt = 0; attempt < 50 && !health; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      health = await fetch(`http://127.0.0.1:${port}/health`).then((response) => response.json() as Promise<{ name?: string }>, () => undefined);
    }
    check(health?.name === "surfacent", "surfacent mcp --http-only answers /health");
  } finally {
    server.kill();
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
  fs.rmSync(path.join(pkg, "README.md"), { force: true });
}
