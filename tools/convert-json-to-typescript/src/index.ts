#!/usr/bin/env node
import { createToolServer, startServer, parseJsonSafe } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/convert-json-to-typescript",
  version: "0.1.0",
});

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toTypeName(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .split("_")
    .filter(Boolean)
    .map(capitalize)
    .join("");
}

interface GeneratorState {
  interfaces: Map<string, string>;
  counter: number;
}

function inferType(value: unknown, name: string, state: GeneratorState): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const elementTypes = new Set(value.map((item) => inferType(item, name + "Item", state)));
    const unionType = [...elementTypes].join(" | ");
    return elementTypes.size === 1 ? `${unionType}[]` : `(${unionType})[]`;
  }

  if (typeof value === "object") {
    return generateInterface(value as Record<string, unknown>, name, state);
  }

  return typeof value;
}

function generateInterface(
  obj: Record<string, unknown>,
  name: string,
  state: GeneratorState
): string {
  const typeName = toTypeName(name);
  const uniqueName = state.interfaces.has(typeName)
    ? `${typeName}${++state.counter}`
    : typeName;

  const fields: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fieldType = inferType(value, key, state);
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
    fields.push(`  ${safeKey}: ${fieldType};`);
  }

  const interfaceStr = `export interface ${uniqueName} {\n${fields.join("\n")}\n}`;
  state.interfaces.set(uniqueName, interfaceStr);
  return uniqueName;
}

server.tool(
  "convert-json-to-typescript",
  "Convert a JSON object or array to TypeScript interfaces. Infers types from values, handles nested objects and arrays.",
  {
    json: z.string().describe("JSON string to convert to TypeScript"),
    rootName: z.string().default("Root").describe("Name for the root interface"),
  },
  async ({ json, rootName }) => {
    const value = parseJsonSafe(json, "json");
    const state: GeneratorState = { interfaces: new Map(), counter: 0 };

    let rootType: string;
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        rootType = generateInterface(value[0] as Record<string, unknown>, rootName, state);
        rootType = `${rootType}[]`;
      } else {
        rootType = inferType(value, rootName, state);
      }
    } else if (typeof value === "object" && value !== null) {
      rootType = generateInterface(value as Record<string, unknown>, rootName, state);
    } else {
      rootType = typeof value;
    }

    const interfaces = [...state.interfaces.values()].join("\n\n");
    const output = interfaces
      ? `${interfaces}\n\nexport type ${toTypeName(rootName)}Data = ${rootType};`
      : `export type ${toTypeName(rootName)} = ${rootType};`;

    return {
      content: [{ type: "text" as const, text: output }],
    };
  }
);

startServer(server);
