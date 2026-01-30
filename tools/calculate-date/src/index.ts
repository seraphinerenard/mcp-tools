#!/usr/bin/env node
import { createToolServer, startServer } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/calculate-date", version: "0.1.0" });

server.tool(
  "calculate-date",
  "Perform date calculations: add/subtract time units, compute difference between dates, get day of week, and more.",
  {
    action: z.enum(["add", "subtract", "diff", "info"]).describe("Action to perform"),
    date: z.string().describe("Date string (ISO 8601 or common formats)"),
    date2: z.string().optional().describe("Second date (required for diff action)"),
    amount: z.number().optional().describe("Amount to add/subtract"),
    unit: z.enum(["days", "hours", "minutes", "seconds", "weeks", "months", "years"]).optional().describe("Unit for add/subtract"),
  },
  async ({ action, date, date2, amount, unit }) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid date: " + date }) }] };
    }

    if (action === "info") {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000) + 1;
      const weekNumber = Math.ceil(dayOfYear / 7);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          iso: d.toISOString(),
          date: d.toDateString(),
          dayOfWeek: dayNames[d.getDay()],
          month: monthNames[d.getMonth()],
          dayOfYear,
          weekNumber,
          timestamp: d.getTime(),
          isLeapYear: (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0,
        }, null, 2) }],
      };
    }

    if (action === "diff") {
      if (!date2) return { content: [{ type: "text" as const, text: JSON.stringify({ error: "date2 is required for diff" }) }] };
      const d2 = new Date(date2);
      if (isNaN(d2.getTime())) return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid date2: " + date2 }) }] };
      const diffMs = d2.getTime() - d.getTime();
      const absDiff = Math.abs(diffMs);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          date1: d.toISOString(),
          date2: d2.toISOString(),
          diff: {
            milliseconds: diffMs,
            seconds: Math.floor(absDiff / 1000),
            minutes: Math.floor(absDiff / 60000),
            hours: Math.floor(absDiff / 3600000),
            days: Math.floor(absDiff / 86400000),
            weeks: Math.floor(absDiff / 604800000),
          },
          isBefore: diffMs > 0,
        }, null, 2) }],
      };
    }

    if ((action === "add" || action === "subtract") && amount !== undefined && unit) {
      const result = new Date(d);
      const mult = action === "subtract" ? -1 : 1;
      const val = amount * mult;
      switch (unit) {
        case "seconds": result.setSeconds(result.getSeconds() + val); break;
        case "minutes": result.setMinutes(result.getMinutes() + val); break;
        case "hours": result.setHours(result.getHours() + val); break;
        case "days": result.setDate(result.getDate() + val); break;
        case "weeks": result.setDate(result.getDate() + val * 7); break;
        case "months": result.setMonth(result.getMonth() + val); break;
        case "years": result.setFullYear(result.getFullYear() + val); break;
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          original: d.toISOString(),
          action, amount, unit,
          result: result.toISOString(),
        }, null, 2) }],
      };
    }

    return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid parameters for action: " + action }) }] };
  }
);

startServer(server);
