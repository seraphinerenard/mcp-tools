#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/generate-regex", version: "0.1.0" });

const COMMON_PATTERNS: Record<string, string> = {
  email: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
  url: "^https?:\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-])?$",
  ipv4: "^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$",
  phone: "^\\+?[1-9]\\d{1,14}$",
  date_iso: "^\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])$",
  hex_color: "^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$",
  uuid: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
  slug: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  semver: "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
};

server.tool(
  "generate-regex",
  "Test a regex pattern against test strings, or get a common regex pattern by name (email, url, ipv4, phone, date_iso, hex_color, uuid, slug, semver).",
  {
    pattern: z.string().optional().describe("Regex pattern to test (or omit to use a named pattern)"),
    patternName: z.string().optional().describe("Named pattern: email, url, ipv4, phone, date_iso, hex_color, uuid, slug, semver"),
    flags: z.string().default("").describe("Regex flags (g, i, m, etc.)"),
    testStrings: z.array(z.string()).default([]).describe("Strings to test against the pattern"),
  },
  async ({ pattern, patternName, flags, testStrings }) => {
    let regexSource: string;
    if (patternName && patternName in COMMON_PATTERNS) {
      regexSource = COMMON_PATTERNS[patternName];
    } else if (pattern) {
      regexSource = pattern;
    } else {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          error: "Provide either a pattern or a valid patternName",
          availablePatterns: Object.keys(COMMON_PATTERNS),
        }, null, 2) }],
      };
    }

    let regex: RegExp;
    try {
      regex = new RegExp(regexSource, flags);
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid regex: " + (e as Error).message }) }],
      };
    }

    const results = testStrings.map((str) => {
      const matches = str.match(regex);
      return { input: str, matches: matches ? matches.slice() : null, isMatch: !!matches };
    });

    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        pattern: regexSource,
        flags,
        patternName: patternName || null,
        testResults: results,
      }, null, 2) }],
    };
  }
);

startServer(server);
