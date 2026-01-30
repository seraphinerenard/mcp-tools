#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/minify-css", version: "0.1.0" });

function minifyCSS(css: string): string {
  let result = css;
  // Remove comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove whitespace around selectors and properties
  result = result.replace(/\s*([{}:;,>~+])\s*/g, "$1");
  // Remove trailing semicolons before closing brace
  result = result.replace(/;}/g, "}");
  // Collapse whitespace
  result = result.replace(/\s+/g, " ");
  // Remove leading/trailing whitespace
  result = result.trim();
  // Shorten hex colors
  result = result.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, "#$1$2$3");
  // Remove units from zero values
  result = result.replace(/\b0(px|em|rem|%|pt|ex|ch|vw|vh|vmin|vmax)\b/g, "0");
  return result;
}

server.tool(
  "minify-css",
  "Minify CSS by removing comments, whitespace, and applying safe optimizations.",
  {
    css: z.string().describe("CSS code to minify"),
  },
  async ({ css }) => {
    requireString(css, "css");
    const minified = minifyCSS(css);
    const savings = css.length - minified.length;
    const percent = css.length > 0 ? Math.round((savings / css.length) * 100) : 0;
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        minified,
        originalSize: css.length,
        minifiedSize: minified.length,
        savings,
        savingsPercent: percent + "%",
      }, null, 2) }],
    };
  }
);

startServer(server);
