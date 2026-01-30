#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/encode-decode-base64", version: "0.1.0" });

server.tool(
  "encode-decode-base64",
  "Encode text to Base64 or decode Base64 to text. Supports standard and URL-safe variants.",
  {
    input: z.string().describe("Text to encode or Base64 string to decode"),
    action: z.enum(["encode", "decode"]).describe("Whether to encode or decode"),
    urlSafe: z.boolean().default(false).describe("Use URL-safe Base64 (RFC 4648 §5)"),
  },
  async ({ input, action, urlSafe }) => {
    requireString(input, "input");
    let result: string;
    if (action === "encode") {
      result = Buffer.from(input, "utf8").toString("base64");
      if (urlSafe) result = result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } else {
      let b64 = input;
      if (urlSafe) {
        b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4 !== 0) b64 += "=";
      }
      result = Buffer.from(b64, "base64").toString("utf8");
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        action,
        urlSafe,
        input: input.length > 200 ? input.substring(0, 200) + "..." : input,
        output: result,
        inputLength: input.length,
        outputLength: result.length,
      }, null, 2) }],
    };
  }
);

startServer(server);
