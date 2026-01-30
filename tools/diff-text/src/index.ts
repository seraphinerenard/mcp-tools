#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/diff-text", version: "0.1.0" });

function computeLCS(a: string[], b: string[]): boolean[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const inLCS: boolean[][] = [Array(m).fill(false), Array(n).fill(false)];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      inLCS[0][i - 1] = true;
      inLCS[1][j - 1] = true;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return inLCS;
}

server.tool(
  "diff-text",
  "Compare two texts line-by-line and produce a unified diff output.",
  {
    original: z.string().describe("Original text"),
    modified: z.string().describe("Modified text"),
    contextLines: z.number().min(0).max(20).default(3).describe("Number of context lines around changes"),
  },
  async ({ original, modified, contextLines }) => {
    requireString(original, "original");
    requireString(modified, "modified");

    const aLines = original.split("\n");
    const bLines = modified.split("\n");
    const lcs = computeLCS(aLines, bLines);

    const diffLines: string[] = [];
    let ai = 0, bi = 0;
    while (ai < aLines.length || bi < bLines.length) {
      if (ai < aLines.length && lcs[0][ai]) {
        if (bi < bLines.length && lcs[1][bi]) {
          diffLines.push(" " + aLines[ai]);
          ai++; bi++;
        } else {
          diffLines.push("+" + bLines[bi]);
          bi++;
        }
      } else if (ai < aLines.length) {
        diffLines.push("-" + aLines[ai]);
        ai++;
      } else {
        diffLines.push("+" + bLines[bi]);
        bi++;
      }
    }

    const added = diffLines.filter(l => l.startsWith("+")).length;
    const removed = diffLines.filter(l => l.startsWith("-")).length;
    const unchanged = diffLines.filter(l => l.startsWith(" ")).length;

    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        summary: { added, removed, unchanged, totalOriginal: aLines.length, totalModified: bLines.length },
        diff: diffLines.join("\n"),
      }, null, 2) }],
    };
  }
);

startServer(server);
