#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/analyze-bundle-size",
  version: "0.1.0",
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  isDynamic: boolean;
}

function analyzeImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  // Static imports
  const staticRe = /import\s+(?:(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]*)\})?(?:\*\s+as\s+(\w+))?)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = staticRe.exec(code)) !== null) {
    const [, defaultImport, namedImports, namespaceImport, source] = match;
    const specifiers: string[] = [];
    if (defaultImport) specifiers.push(defaultImport);
    if (namedImports) {
      specifiers.push(...namedImports.split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean));
    }
    if (namespaceImport) specifiers.push(`* as ${namespaceImport}`);
    imports.push({
      source,
      specifiers,
      isDefault: !!defaultImport,
      isNamespace: !!namespaceImport,
      isDynamic: false,
    });
  }

  // Side-effect imports
  const sideEffectRe = /import\s+['"]([^'"]+)['"]/g;
  while ((match = sideEffectRe.exec(code)) !== null) {
    imports.push({
      source: match[1],
      specifiers: [],
      isDefault: false,
      isNamespace: false,
      isDynamic: false,
    });
  }

  // Dynamic imports
  const dynamicRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRe.exec(code)) !== null) {
    imports.push({
      source: match[1],
      specifiers: [],
      isDefault: false,
      isNamespace: false,
      isDynamic: true,
    });
  }

  // require() calls
  const requireRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRe.exec(code)) !== null) {
    imports.push({
      source: match[1],
      specifiers: [],
      isDefault: false,
      isNamespace: false,
      isDynamic: false,
    });
  }

  return imports;
}

function estimateSize(code: string): { raw: number; minified: number; gzipEstimate: number } {
  const raw = Buffer.byteLength(code, "utf-8");
  // Rough minification: remove comments, whitespace
  const minified = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:])\s*/g, "$1")
    .trim();
  const minBytes = Buffer.byteLength(minified, "utf-8");
  // Gzip typically achieves ~60-70% compression on minified JS
  const gzipEstimate = Math.round(minBytes * 0.35);

  return { raw, minified: minBytes, gzipEstimate };
}

server.tool(
  "analyze-bundle-size",
  "Analyze JavaScript/TypeScript source code for bundle size impact. Reports imports, estimated sizes, and optimization suggestions.",
  {
    code: z.string().describe("JavaScript or TypeScript source code to analyze"),
    filename: z.string().default("input.js").describe("Filename for context"),
  },
  async ({ code, filename }) => {
    requireString(code, "code");

    const imports = analyzeImports(code);
    const sizes = estimateSize(code);

    const nodeModuleImports = imports.filter((i) => !i.source.startsWith(".") && !i.source.startsWith("/"));
    const localImports = imports.filter((i) => i.source.startsWith(".") || i.source.startsWith("/"));

    const suggestions: string[] = [];

    // Check for namespace imports of known large packages
    const namespaceImports = imports.filter((i) => i.isNamespace && !i.source.startsWith("."));
    if (namespaceImports.length > 0) {
      suggestions.push(
        `Consider using named imports instead of namespace imports for: ${namespaceImports.map((i) => i.source).join(", ")}. This enables better tree-shaking.`
      );
    }

    // Check for large known packages
    const heavyPackages = ["moment", "lodash", "rxjs", "jquery", "underscore"];
    const heavyImports = nodeModuleImports.filter((i) => heavyPackages.some((p) => i.source === p || i.source.startsWith(p + "/")));
    if (heavyImports.length > 0) {
      const alternatives: Record<string, string> = {
        moment: "date-fns or dayjs",
        lodash: "lodash-es (with named imports) or individual lodash/* packages",
        jquery: "vanilla DOM APIs",
        underscore: "native Array/Object methods",
      };
      for (const imp of heavyImports) {
        const pkg = heavyPackages.find((p) => imp.source === p || imp.source.startsWith(p + "/"));
        if (pkg && alternatives[pkg]) {
          suggestions.push(`Consider replacing '${pkg}' with ${alternatives[pkg]} for smaller bundle size.`);
        }
      }
    }

    if (!imports.some((i) => i.isDynamic) && nodeModuleImports.length > 5) {
      suggestions.push("Consider using dynamic import() for less critical dependencies to enable code splitting.");
    }

    const result = {
      filename,
      sizes: {
        raw: formatBytes(sizes.raw),
        minifiedEstimate: formatBytes(sizes.minified),
        gzipEstimate: formatBytes(sizes.gzipEstimate),
      },
      imports: {
        total: imports.length,
        nodeModules: nodeModuleImports.map((i) => ({
          package: i.source,
          specifiers: i.specifiers,
          isNamespace: i.isNamespace,
          isDynamic: i.isDynamic,
        })),
        local: localImports.map((i) => i.source),
      },
      suggestions,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
