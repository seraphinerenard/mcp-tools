#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/analyze-git-diff", version: "0.1.0" });

interface FileChange {
  file: string;
  additions: number;
  deletions: number;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

function analyzeDiff(diff: string) {
  const files: FileChange[] = [];
  const chunks = diff.split(/^diff --git /m).filter(Boolean);

  for (const chunk of chunks) {
    const headerMatch = chunk.match(/a\/(.+?)\s+b\/(.+)/);
    if (!headerMatch) continue;

    const fileA = headerMatch[1];
    const fileB = headerMatch[2];
    const isNew = chunk.includes("new file mode");
    const isDeleted = chunk.includes("deleted file mode");
    const isRenamed = fileA !== fileB;

    let additions = 0, deletions = 0;
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }

    files.push({ file: fileB, additions, deletions, isNew, isDeleted, isRenamed });
  }

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

  // Group by extension
  const byExtension: Record<string, { files: number; additions: number; deletions: number }> = {};
  for (const f of files) {
    const ext = f.file.includes(".") ? "." + f.file.split(".").pop() : "(none)";
    if (!byExtension[ext]) byExtension[ext] = { files: 0, additions: 0, deletions: 0 };
    byExtension[ext].files++;
    byExtension[ext].additions += f.additions;
    byExtension[ext].deletions += f.deletions;
  }

  return {
    summary: {
      filesChanged: files.length,
      totalAdditions,
      totalDeletions,
      netChange: totalAdditions - totalDeletions,
      newFiles: files.filter(f => f.isNew).length,
      deletedFiles: files.filter(f => f.isDeleted).length,
      renamedFiles: files.filter(f => f.isRenamed).length,
    },
    byExtension,
    files,
  };
}

server.tool(
  "analyze-git-diff",
  "Analyze a git diff to extract statistics: files changed, additions, deletions, file types, and more.",
  {
    diff: z.string().describe("Git diff output to analyze"),
  },
  async ({ diff }) => {
    requireString(diff, "diff");
    const analysis = analyzeDiff(diff);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(analysis, null, 2) }],
    };
  }
);

startServer(server);
