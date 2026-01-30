#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/analyze-code-complexity",
  version: "0.1.0",
});

interface FunctionMetrics {
  name: string;
  startLine: number;
  lineCount: number;
  cyclomaticComplexity: number;
  nestingDepth: number;
  parameterCount: number;
  rating: "A" | "B" | "C" | "D" | "F";
}

interface FileMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  functions: FunctionMetrics[];
  averageComplexity: number;
  maxComplexity: number;
  maxNesting: number;
  overallRating: "A" | "B" | "C" | "D" | "F";
}

function rateComplexity(cc: number): "A" | "B" | "C" | "D" | "F" {
  if (cc <= 5) return "A";
  if (cc <= 10) return "B";
  if (cc <= 20) return "C";
  if (cc <= 50) return "D";
  return "F";
}

function analyze(code: string): FileMetrics {
  const lines = code.split("\n");
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      blankLines++;
    } else if (inBlockComment) {
      commentLines++;
      if (trimmed.includes("*/")) inBlockComment = false;
    } else if (trimmed.startsWith("/*")) {
      commentLines++;
      if (!trimmed.includes("*/")) inBlockComment = false;
      inBlockComment = !trimmed.includes("*/");
    } else if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
      commentLines++;
    } else {
      codeLines++;
    }
  }

  // Extract functions (works for JS/TS/Java/C-like)
  const funcRegexes = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?:=>|:\s*\w+\s*=>)/g,
    /(\w+)\s*\(([^)]*)\)\s*\{/g,
    /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/g,
    /def\s+(\w+)\s*\(([^)]*)\)/g,
  ];

  const foundFunctions = new Map<string, { line: number; params: string }>();
  for (const regex of funcRegexes) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      const name = match[1];
      const params = match[2] || "";
      if (name && !["if", "else", "for", "while", "switch", "catch", "return", "new", "class"].includes(name)) {
        const lineNum = code.substring(0, match.index).split("\n").length;
        if (!foundFunctions.has(`${name}:${lineNum}`)) {
          foundFunctions.set(`${name}:${lineNum}`, { line: lineNum, params });
        }
      }
    }
  }

  // Calculate function boundaries and metrics
  const functions: FunctionMetrics[] = [];
  const sortedFuncs = [...foundFunctions.entries()].sort((a, b) => a[1].line - b[1].line);

  for (let i = 0; i < sortedFuncs.length; i++) {
    const [key, { line: startLine, params }] = sortedFuncs[i];
    const name = key.split(":")[0];
    const endLine = i + 1 < sortedFuncs.length
      ? sortedFuncs[i + 1][1].line - 1
      : lines.length;

    const funcBody = lines.slice(startLine - 1, endLine).join("\n");
    const lineCount = endLine - startLine + 1;

    // Cyclomatic complexity: count decision points
    let cc = 1;
    const decisionPatterns = [
      /\bif\b/g, /\belse\s+if\b/g, /\bwhile\b/g, /\bfor\b/g,
      /\bcase\b/g, /\bcatch\b/g, /\b\?\?/g, /\?\./g, /&&/g, /\|\|/g,
      /\?\s*[^:]+\s*:/g,
    ];
    for (const pattern of decisionPatterns) {
      const matches = funcBody.match(pattern);
      if (matches) cc += matches.length;
    }

    // Max nesting depth
    let maxNesting = 0;
    let currentNesting = 0;
    for (const ch of funcBody) {
      if (ch === "{") {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (ch === "}") {
        currentNesting = Math.max(0, currentNesting - 1);
      }
    }

    const paramCount = params.trim() ? params.split(",").length : 0;

    functions.push({
      name,
      startLine,
      lineCount,
      cyclomaticComplexity: cc,
      nestingDepth: maxNesting,
      parameterCount: paramCount,
      rating: rateComplexity(cc),
    });
  }

  const avgComplexity = functions.length > 0
    ? functions.reduce((sum, f) => sum + f.cyclomaticComplexity, 0) / functions.length
    : 0;
  const maxComplexity = functions.length > 0
    ? Math.max(...functions.map((f) => f.cyclomaticComplexity))
    : 0;
  const maxNesting = functions.length > 0
    ? Math.max(...functions.map((f) => f.nestingDepth))
    : 0;

  return {
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
    functions,
    averageComplexity: Math.round(avgComplexity * 10) / 10,
    maxComplexity,
    maxNesting,
    overallRating: rateComplexity(avgComplexity),
  };
}

server.tool(
  "analyze-code-complexity",
  "Analyze code complexity metrics including cyclomatic complexity, nesting depth, and function-level ratings. Supports JS/TS/Java/Python/C-like languages.",
  {
    code: z.string().describe("Source code to analyze"),
    filename: z.string().default("input.ts").describe("Filename for context"),
  },
  async ({ code, filename }) => {
    requireString(code, "code");
    const metrics = analyze(code);

    const suggestions: string[] = [];
    for (const fn of metrics.functions) {
      if (fn.cyclomaticComplexity > 10) {
        suggestions.push(`'${fn.name}' (line ${fn.startLine}): complexity ${fn.cyclomaticComplexity} — consider breaking into smaller functions`);
      }
      if (fn.nestingDepth > 4) {
        suggestions.push(`'${fn.name}' (line ${fn.startLine}): nesting depth ${fn.nestingDepth} — use early returns or extract logic`);
      }
      if (fn.parameterCount > 4) {
        suggestions.push(`'${fn.name}' (line ${fn.startLine}): ${fn.parameterCount} parameters — consider using an options object`);
      }
      if (fn.lineCount > 50) {
        suggestions.push(`'${fn.name}' (line ${fn.startLine}): ${fn.lineCount} lines — consider splitting into smaller functions`);
      }
    }

    const result = { filename, metrics, suggestions };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
