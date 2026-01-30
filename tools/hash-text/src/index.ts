#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";
import { createHash, getHashes } from "node:crypto";

const server = createToolServer({ name: "@mcp-tools/hash-text", version: "0.1.0" });

server.tool(
  "hash-text",
  "Hash text using various algorithms (md5, sha1, sha256, sha512, etc.).",
  {
    text: z.string().describe("Text to hash"),
    algorithm: z.enum(["md5", "sha1", "sha256", "sha384", "sha512"]).default("sha256").describe("Hash algorithm"),
    encoding: z.enum(["hex", "base64"]).default("hex").describe("Output encoding"),
  },
  async ({ text, algorithm, encoding }) => {
    requireString(text, "text");
    const hash = createHash(algorithm).update(text, "utf8").digest(encoding);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        algorithm,
        encoding,
        hash,
        inputLength: text.length,
      }, null, 2) }],
    };
  }
);

startServer(server);
