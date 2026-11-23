// Every playground example's Code tab must paste and compile: print each one
// into src/__snippets__, typecheck the demo app with them, then remove them.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

type ImportLine = { from: string; names: string[]; type?: boolean };
type Snippet = { imports: ImportLine[]; setup?: string[]; jsx: string; language?: "tsx" | "css" };
type Example = { id: string; code?: Snippet };
type Page = {
  id: string;
  title: string;
  component: (props: object) => { props: { states?: Example[]; code?: Snippet } };
};

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "src/__snippets__");
let count = 0;

const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { PAGES } = (await server.ssrLoadModule("/src/playground/registry.ts")) as { PAGES: Page[] };
  const { snippetSource, exampleName } = (await server.ssrLoadModule("/src/playground/snippet.ts")) as {
    snippetSource: (code: Snippet, name: string) => string;
    exampleName: (title: string) => string;
  };
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out);
  for (const page of PAGES) {
    // Pages are plain functions of their props: a StatePage (a list of states)
    // or an AreaPage (a single example).
    const element = page.component({ meta: page, stateId: null, onStateChange() {} });
    const examples = element.props.states ?? [{ id: "area", code: element.props.code }];
    for (const example of examples) {
      if (!example.code) throw new Error(`${page.id}/${example.id} has no code example`);
      if (example.code.language === "css") continue;
      const source = snippetSource(example.code, exampleName(page.title));
      fs.writeFileSync(path.join(out, `${page.id}--${example.id}.tsx`), `${source}\n`);
      count++;
    }
  }
} finally {
  await server.close();
}

try {
  execSync("npx tsc -p tsconfig.json", { cwd: root, stdio: "inherit" });
  console.log(`${count} code examples compile.`);
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
