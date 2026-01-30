#!/usr/bin/env node
import { createToolServer, startServer, requireString, optionalBoolean } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/convert-csv-to-json",
  version: "0.1.0",
});

function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };
  for (const char of firstLine) {
    if (char in counts) counts[char]++;
  }
  let best = ",";
  let max = 0;
  for (const [char, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = char;
    }
  }
  return best;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function inferType(value: string): string | number | boolean | null {
  if (value === "" || value.toLowerCase() === "null" || value.toLowerCase() === "na" || value.toLowerCase() === "n/a") {
    return null;
  }
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;

  return value;
}

server.tool(
  "convert-csv-to-json",
  "Convert CSV data to JSON. Auto-detects delimiters, handles quoted fields, and optionally infers types.",
  {
    csv: z.string().describe("CSV string to convert"),
    hasHeaders: z.boolean().default(true).describe("Whether the first row contains headers"),
    inferTypes: z.boolean().default(true).describe("Infer number/boolean/null types from values"),
    delimiter: z.string().optional().describe("Column delimiter (auto-detected if not specified)"),
  },
  async ({ csv, hasHeaders, inferTypes, delimiter }) => {
    requireString(csv, "csv");

    const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No data found in CSV" }) }],
      };
    }

    const sep = delimiter || detectDelimiter(lines[0]);
    let headers: string[];
    let dataStart: number;

    if (hasHeaders) {
      headers = parseCSVLine(lines[0], sep);
      dataStart = 1;
    } else {
      const firstRow = parseCSVLine(lines[0], sep);
      headers = firstRow.map((_, i) => `column${i + 1}`);
      dataStart = 0;
    }

    const rows: Record<string, unknown>[] = [];
    for (let i = dataStart; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i], sep);
      const row: Record<string, unknown> = {};
      for (let j = 0; j < headers.length; j++) {
        const value = fields[j] ?? "";
        row[headers[j]] = inferTypes ? inferType(value) : value;
      }
      rows.push(row);
    }

    const result = {
      rowCount: rows.length,
      columns: headers,
      delimiter: sep === "\t" ? "tab" : sep,
      data: rows,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
