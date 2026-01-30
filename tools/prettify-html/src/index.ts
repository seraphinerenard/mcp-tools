#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/prettify-html", version: "0.1.0" });

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function prettifyHTML(html: string, indentStr: string): string {
  // Normalize whitespace between tags
  let normalized = html.replace(/>\s+</g, ">\n<").replace(/\s+/g, " ").trim();

  const tokens = normalized.match(/<[^>]+>|[^<]+/g) || [];
  const lines: string[] = [];
  let depth = 0;

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("</")) {
      // Closing tag
      depth = Math.max(0, depth - 1);
      lines.push(indentStr.repeat(depth) + trimmed);
    } else if (trimmed.startsWith("<")) {
      // Opening or self-closing tag
      lines.push(indentStr.repeat(depth) + trimmed);
      const tagMatch = trimmed.match(/^<(\w+)/);
      const isSelfClosing = trimmed.endsWith("/>") || trimmed.startsWith("<!") || trimmed.startsWith("<?");
      if (tagMatch && !isSelfClosing && !VOID_ELEMENTS.has(tagMatch[1].toLowerCase())) {
        depth++;
      }
    } else {
      // Text content
      lines.push(indentStr.repeat(depth) + trimmed);
    }
  }

  return lines.join("\n");
}

server.tool(
  "prettify-html",
  "Format HTML with proper indentation. Handles self-closing tags, void elements, and nested structures.",
  {
    html: z.string().describe("HTML to prettify"),
    indent: z.string().default("  ").describe("Indentation string"),
  },
  async ({ html, indent }) => {
    requireString(html, "html");
    const formatted = prettifyHTML(html, indent);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        formatted,
        originalLength: html.length,
        formattedLength: formatted.length,
      }, null, 2) }],
    };
  }
);

startServer(server);
