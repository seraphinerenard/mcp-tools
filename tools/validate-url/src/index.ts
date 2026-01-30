#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/validate-url", version: "0.1.0" });

server.tool(
  "validate-url",
  "Validate and parse URLs. Extracts protocol, host, path, query parameters, and fragment.",
  {
    urls: z.array(z.string()).min(1).describe("URLs to validate and parse"),
  },
  async ({ urls }) => {
    const results = urls.map((urlStr) => {
      try {
        const url = new URL(urlStr);
        const params: Record<string, string> = {};
        url.searchParams.forEach((value, key) => { params[key] = value; });

        return {
          input: urlStr,
          valid: true,
          components: {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || null,
            pathname: url.pathname,
            search: url.search || null,
            hash: url.hash || null,
            origin: url.origin,
            username: url.username || null,
            password: url.password ? "***" : null,
          },
          queryParameters: Object.keys(params).length > 0 ? params : null,
          isHttps: url.protocol === "https:",
          isLocalhost: url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1",
        };
      } catch {
        return { input: urlStr, valid: false, error: "Invalid URL format" };
      }
    });

    const validCount = results.filter(r => r.valid).length;
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        total: results.length, valid: validCount, invalid: results.length - validCount,
        results,
      }, null, 2) }],
    };
  }
);

startServer(server);
