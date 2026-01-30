#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/format-json", version: "0.1.0" });

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

server.tool(
  "format-json",
  "Format, minify, sort keys, or validate JSON data.",
  {
    json: z.string().describe("JSON string to format"),
    indent: z.number().default(2).describe("Indentation spaces (0 for minify)"),
    sortKeys: z.boolean().default(false).describe("Sort object keys alphabetically"),
  },
  async ({ json, indent, sortKeys: doSort }) => {
    requireString(json, "json");
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      const err = e as Error;
      return { content: [{ type: "text" as const, text: JSON.stringify({ valid: false, error: err.message }) }] };
    }
    if (doSort) parsed = sortKeys(parsed);
    const formatted = indent === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        valid: true,
        formatted,
        originalLength: json.length,
        formattedLength: formatted.length,
      }, null, 2) }],
    };
  }
);

startServer(server);
