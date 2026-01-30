#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/format-sql", version: "0.1.0" });

const MAJOR_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN",
  "OUTER JOIN", "CROSS JOIN", "FULL JOIN", "ON", "AND", "OR", "ORDER BY",
  "GROUP BY", "HAVING", "LIMIT", "OFFSET", "UNION", "UNION ALL", "INSERT INTO",
  "VALUES", "UPDATE", "SET", "DELETE FROM", "CREATE TABLE", "ALTER TABLE",
  "DROP TABLE", "WITH", "AS", "CASE", "WHEN", "THEN", "ELSE", "END",
];

function formatSQL(sql: string, indent: string, uppercase: boolean): string {
  let formatted = sql.replace(/\s+/g, " ").trim();

  if (uppercase) {
    for (const kw of MAJOR_KEYWORDS) {
      const regex = new RegExp("\\b" + kw.replace(/ /g, "\\s+") + "\\b", "gi");
      formatted = formatted.replace(regex, kw);
    }
  }

  // Add newlines before major keywords
  const lineBreakKeywords = [
    "SELECT", "FROM", "WHERE", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN",
    "OUTER JOIN", "CROSS JOIN", "FULL JOIN", "ORDER BY", "GROUP BY", "HAVING",
    "LIMIT", "OFFSET", "UNION", "UNION ALL", "INSERT INTO", "VALUES",
    "UPDATE", "SET", "DELETE FROM", "WITH",
  ];

  for (const kw of lineBreakKeywords) {
    const regex = new RegExp("\\s+" + kw.replace(/ /g, "\\s+") + "\\b", "gi");
    formatted = formatted.replace(regex, "\n" + kw);
  }

  // Indent subparts after SELECT, WHERE, etc.
  const lines = formatted.split("\n");
  const result: string[] = [];
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const startsWithMajor = lineBreakKeywords.some(kw =>
      trimmed.toUpperCase().startsWith(kw)
    );

    if (startsWithMajor) {
      result.push(indent.repeat(depth) + trimmed);
    } else {
      result.push(indent.repeat(depth + 1) + trimmed);
    }

    depth += (trimmed.match(/\(/g) || []).length;
    depth -= (trimmed.match(/\)/g) || []).length;
    if (depth < 0) depth = 0;
  }

  return result.join("\n");
}

server.tool(
  "format-sql",
  "Format SQL queries with proper indentation and keyword casing.",
  {
    sql: z.string().describe("SQL query to format"),
    indent: z.string().default("  ").describe("Indentation string (default: 2 spaces)"),
    uppercase: z.boolean().default(true).describe("Uppercase SQL keywords"),
  },
  async ({ sql, indent, uppercase }) => {
    requireString(sql, "sql");
    const formatted = formatSQL(sql, indent, uppercase);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        formatted,
        originalLength: sql.length,
        formattedLength: formatted.length,
      }, null, 2) }],
    };
  }
);

startServer(server);
