#!/usr/bin/env node
import { createToolServer, startServer } from "@mcp-tools/core";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const server = createToolServer({ name: "@mcp-tools/generate-uuid", version: "0.1.0" });

server.tool(
  "generate-uuid",
  "Generate one or more random UUIDs (v4).",
  {
    count: z.number().min(1).max(100).default(1).describe("Number of UUIDs to generate"),
    uppercase: z.boolean().default(false).describe("Output in uppercase"),
    noDashes: z.boolean().default(false).describe("Remove dashes from UUIDs"),
  },
  async ({ count, uppercase, noDashes }) => {
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      let uuid: string = randomUUID();
      if (noDashes) uuid = uuid.replace(/-/g, "");
      if (uppercase) uuid = uuid.toUpperCase();
      uuids.push(uuid);
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ count: uuids.length, uuids }, null, 2) }],
    };
  }
);

startServer(server);
