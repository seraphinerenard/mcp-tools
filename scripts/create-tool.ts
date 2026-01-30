import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const toolName = process.argv[2];
if (!toolName) {
  console.error("Usage: pnpm create-tool <tool-name>");
  console.error("Example: pnpm create-tool convert-yaml-to-json");
  process.exit(1);
}

const slug = toolName.replace(/^mcp-/, "");
const toolDir = join(process.cwd(), "tools", slug);
const pkgName = `@mcp-tools/${slug}`;

// Convert slug to title: "convert-yaml-to-json" -> "Convert YAML to JSON"
const title = slug
  .split("-")
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join(" ");

const camelName = slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

mkdirSync(join(toolDir, "src"), { recursive: true });

// package.json
writeFileSync(
  join(toolDir, "package.json"),
  JSON.stringify(
    {
      name: pkgName,
      version: "0.1.0",
      description: `MCP tool server: ${title}`,
      type: "module",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      bin: { [pkgName]: "dist/index.js" },
      scripts: {
        build: "tsc",
        clean: "rm -rf dist",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@mcp-tools/core": "workspace:*",
        "@modelcontextprotocol/sdk": "^1.0.0",
      },
      devDependencies: {
        typescript: "^5.4.0",
      },
      files: ["dist"],
      license: "MIT",
    },
    null,
    2
  ) + "\n"
);

// tsconfig.json
writeFileSync(
  join(toolDir, "tsconfig.json"),
  JSON.stringify(
    {
      extends: "../../tsconfig.json",
      compilerOptions: { outDir: "dist", rootDir: "src" },
      include: ["src"],
    },
    null,
    2
  ) + "\n"
);

// src/index.ts
writeFileSync(
  join(toolDir, "src", "index.ts"),
  `#!/usr/bin/env node
import { createToolServer, startServer } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "${pkgName}",
  version: "0.1.0",
});

server.tool(
  "${slug}",
  "${title}",
  {
    input: z.string().describe("Input value"),
  },
  async ({ input }) => {
    // TODO: Implement tool logic
    return {
      content: [{ type: "text" as const, text: \`Result: \${input}\` }],
    };
  }
);

startServer(server);
`
);

console.log(`Created tool: ${pkgName}`);
console.log(`  Directory: tools/${slug}/`);
console.log(`  Edit: tools/${slug}/src/index.ts`);
console.log("");
console.log("Next steps:");
console.log("  pnpm install");
console.log(`  pnpm --filter ${pkgName} build`);
