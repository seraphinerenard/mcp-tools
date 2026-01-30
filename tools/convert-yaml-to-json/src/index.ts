#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/convert-yaml-to-json", version: "0.1.0" });

function parseSimpleYaml(yaml: string): unknown {
  const lines = yaml.split("\n");
  const root: Record<string, unknown> = {};
  const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: root, indent: -1 }];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    const content = trimmed.trim();

    // Pop stack to find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    // List item
    if (content.startsWith("- ")) {
      const key = Object.keys(parent).pop();
      if (key && Array.isArray(parent[key])) {
        (parent[key] as unknown[]).push(parseValue(content.substring(2)));
      } else if (key) {
        parent[key] = [parseValue(content.substring(2))];
      }
      continue;
    }

    const colonIndex = content.indexOf(":");
    if (colonIndex === -1) continue;

    const key = content.substring(0, colonIndex).trim();
    const rawValue = content.substring(colonIndex + 1).trim();

    if (rawValue === "" || rawValue === "|" || rawValue === ">") {
      parent[key] = {};
      stack.push({ obj: parent[key] as Record<string, unknown>, indent });
    } else {
      parent[key] = parseValue(rawValue);
    }
  }

  return root;
}

function parseValue(val: string): unknown {
  if (val === "null" || val === "~") return null;
  if (val === "true") return true;
  if (val === "false") return false;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  // Remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  // Inline array
  if (val.startsWith("[") && val.endsWith("]")) {
    return val.slice(1, -1).split(",").map(s => parseValue(s.trim()));
  }
  return val;
}

server.tool(
  "convert-yaml-to-json",
  "Convert YAML to JSON. Supports basic YAML features: key-value pairs, nested objects, arrays, and scalar types.",
  {
    yaml: z.string().describe("YAML string to convert"),
    indent: z.number().default(2).describe("JSON indentation spaces"),
  },
  async ({ yaml, indent }) => {
    requireString(yaml, "yaml");
    try {
      const parsed = parseSimpleYaml(yaml);
      const json = JSON.stringify(parsed, null, indent);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, json, inputLength: yaml.length }, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: (e as Error).message }) }],
      };
    }
  }
);

startServer(server);
