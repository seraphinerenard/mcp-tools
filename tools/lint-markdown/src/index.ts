#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/lint-markdown", version: "0.1.0" });

interface LintIssue {
  line: number;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

function lintMarkdown(md: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = md.split("\n");

  let prevHeadingLevel = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Check heading levels
    const headingMatch = line.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      if (level === 1 && prevHeadingLevel >= 1) {
        issues.push({ line: lineNum, rule: "single-h1", message: "Multiple H1 headings found", severity: "warning" });
      }
      if (level > prevHeadingLevel + 1 && prevHeadingLevel > 0) {
        issues.push({ line: lineNum, rule: "heading-increment", message: `Heading level skipped from H${prevHeadingLevel} to H${level}`, severity: "warning" });
      }
      prevHeadingLevel = level;

      if (!line.match(/^#{1,6}\s+\S/)) {
        issues.push({ line: lineNum, rule: "heading-space", message: "No space after heading marker", severity: "error" });
      }
    }

    // Trailing whitespace
    if (line.match(/\s{3,}$/) || (line.match(/\s$/) && !line.match(/\s{2}$/))) {
      issues.push({ line: lineNum, rule: "no-trailing-spaces", message: "Trailing whitespace (not a line break)", severity: "warning" });
    }

    // Very long lines (>200 chars, excluding links)
    if (line.length > 200 && !line.includes("](")) {
      issues.push({ line: lineNum, rule: "line-length", message: `Line length ${line.length} exceeds 200 characters`, severity: "warning" });
    }

    // Empty link text
    if (line.includes("[](")) {
      issues.push({ line: lineNum, rule: "no-empty-links", message: "Empty link text", severity: "error" });
    }

    // Bare URLs (simple check)
    if (line.match(/(?<!\(|<)https?:\/\/[^\s)>]+/) && !line.match(/\[.*\]\(https?:\/\//)) {
      issues.push({ line: lineNum, rule: "no-bare-urls", message: "Bare URL found (consider using a link)", severity: "warning" });
    }
  }

  // Check for trailing newline
  if (md.length > 0 && !md.endsWith("\n")) {
    issues.push({ line: lines.length, rule: "final-newline", message: "File should end with a newline", severity: "warning" });
  }

  return issues;
}

server.tool(
  "lint-markdown",
  "Lint Markdown text for common issues: heading levels, trailing whitespace, bare URLs, empty links, and more.",
  {
    markdown: z.string().describe("Markdown text to lint"),
  },
  async ({ markdown }) => {
    requireString(markdown, "markdown");
    const issues = lintMarkdown(markdown);
    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        totalIssues: issues.length,
        errors,
        warnings,
        issues,
      }, null, 2) }],
    };
  }
);

startServer(server);
