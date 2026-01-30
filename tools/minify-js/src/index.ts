#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/minify-js", version: "0.1.0" });

function minifyJS(js: string): string {
  let result = js;
  // Remove single-line comments (but not URLs with //)
  result = result.replace(/(?<![:"'])\/\/(?![\/\*]).*$/gm, "");
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  // Collapse whitespace (preserve string literals naively)
  result = result.replace(/\s+/g, " ");
  // Remove spaces around operators
  result = result.replace(/\s*([{}();,=+\-*/<>!&|?:])\s*/g, "$1");
  // Remove trailing semicolons before closing brace
  result = result.replace(/;}/g, "}");
  result = result.trim();
  return result;
}

server.tool(
  "minify-js",
  "Basic JavaScript minification: removes comments and unnecessary whitespace. For production use, consider a full minifier like terser.",
  {
    js: z.string().describe("JavaScript code to minify"),
  },
  async ({ js }) => {
    requireString(js, "js");
    const minified = minifyJS(js);
    const savings = js.length - minified.length;
    const percent = js.length > 0 ? Math.round((savings / js.length) * 100) : 0;
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        minified,
        originalSize: js.length,
        minifiedSize: minified.length,
        savings,
        savingsPercent: percent + "%",
      }, null, 2) }],
    };
  }
);

startServer(server);
