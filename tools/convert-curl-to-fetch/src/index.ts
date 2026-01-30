#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/convert-curl-to-fetch",
  version: "0.1.0",
});

interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  auth?: string;
}

function parseCurl(command: string): ParsedCurl {
  const result: ParsedCurl = { url: "", method: "GET", headers: {} };

  // Normalize multiline commands
  const normalized = command
    .replace(/\\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove 'curl' prefix
  const args = normalized.replace(/^curl\s+/, "");

  // Tokenize respecting quotes
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < args.length; i++) {
    const ch = args[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === " " && !inSingle && !inDouble) {
      if (current) tokens.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      result.method = tokens[++i]?.toUpperCase() || "GET";
    } else if (token === "-H" || token === "--header") {
      const header = tokens[++i] || "";
      const colonIdx = header.indexOf(":");
      if (colonIdx > 0) {
        const key = header.substring(0, colonIdx).trim();
        const val = header.substring(colonIdx + 1).trim();
        result.headers[key] = val;
      }
    } else if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      result.body = tokens[++i] || "";
      if (result.method === "GET") result.method = "POST";
    } else if (token === "-u" || token === "--user") {
      result.auth = tokens[++i] || "";
    } else if (token === "--compressed" || token === "-s" || token === "-S" ||
               token === "-k" || token === "--insecure" || token === "-L" ||
               token === "--location" || token === "-v" || token === "--verbose") {
      // Skip flags without arguments
    } else if (!token.startsWith("-")) {
      result.url = token;
    }
  }

  if (result.auth) {
    const encoded = Buffer.from(result.auth).toString("base64");
    result.headers["Authorization"] = `Basic ${encoded}`;
  }

  return result;
}

function generateFetch(parsed: ParsedCurl, style: string): string {
  const opts: string[] = [];

  if (parsed.method !== "GET") {
    opts.push(`  method: "${parsed.method}"`);
  }

  const headerEntries = Object.entries(parsed.headers);
  if (headerEntries.length > 0) {
    const hdrs = headerEntries
      .map(([k, v]) => `    "${k}": "${v}"`)
      .join(",\n");
    opts.push(`  headers: {\n${hdrs}\n  }`);
  }

  if (parsed.body) {
    const isJson = parsed.body.trim().startsWith("{") || parsed.body.trim().startsWith("[");
    if (isJson) {
      opts.push(`  body: JSON.stringify(${parsed.body})`);
    } else {
      opts.push(`  body: ${JSON.stringify(parsed.body)}`);
    }
  }

  const optsStr = opts.length > 0 ? `, {\n${opts.join(",\n")}\n}` : "";

  if (style === "async-await") {
    return `const response = await fetch("${parsed.url}"${optsStr});\nconst data = await response.json();`;
  }

  return `fetch("${parsed.url}"${optsStr})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error(error));`;
}

server.tool(
  "convert-curl-to-fetch",
  "Convert a cURL command to JavaScript fetch API code. Supports headers, methods, auth, and request bodies.",
  {
    curl: z.string().describe("The cURL command to convert"),
    style: z.enum(["async-await", "promise"]).default("async-await").describe("Output style"),
  },
  async ({ curl, style }) => {
    requireString(curl, "curl");
    const parsed = parseCurl(curl);

    if (!parsed.url) {
      return {
        content: [{ type: "text" as const, text: "Error: Could not extract URL from cURL command" }],
      };
    }

    const code = generateFetch(parsed, style);

    const result = {
      parsed: {
        url: parsed.url,
        method: parsed.method,
        headers: parsed.headers,
        hasBody: !!parsed.body,
      },
      code,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
