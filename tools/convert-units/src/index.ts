#!/usr/bin/env node
import { createToolServer, startServer } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/convert-units", version: "0.1.0" });

const CONVERSIONS: Record<string, Record<string, number>> = {
  // Length (base: meters)
  mm: { m: 0.001 }, cm: { m: 0.01 }, m: { m: 1 }, km: { m: 1000 },
  in: { m: 0.0254 }, ft: { m: 0.3048 }, yd: { m: 0.9144 }, mi: { m: 1609.344 },
  // Weight (base: grams)
  mg: { g: 0.001 }, g: { g: 1 }, kg: { g: 1000 },
  oz: { g: 28.3495 }, lb: { g: 453.592 }, ton: { g: 907185 },
  // Volume (base: liters)
  ml: { l: 0.001 }, l: { l: 1 }, gal: { l: 3.78541 },
  qt: { l: 0.946353 }, pt: { l: 0.473176 }, cup: { l: 0.236588 },
  floz: { l: 0.0295735 },
  // Data (base: bytes)
  b: { byte: 1 }, kb: { byte: 1024 }, mb: { byte: 1048576 },
  gb: { byte: 1073741824 }, tb: { byte: 1099511627776 },
  // Time (base: seconds)
  ms: { s: 0.001 }, s: { s: 1 }, min: { s: 60 },
  hr: { s: 3600 }, day: { s: 86400 }, week: { s: 604800 },
};

function getBaseUnit(unit: string): string | null {
  const entry = CONVERSIONS[unit.toLowerCase()];
  if (!entry) return null;
  return Object.keys(entry)[0];
}

function toBase(value: number, unit: string): { base: string; value: number } | null {
  const lower = unit.toLowerCase();
  const entry = CONVERSIONS[lower];
  if (!entry) return null;
  const base = Object.keys(entry)[0];
  return { base, value: value * entry[base] };
}

function fromBase(value: number, unit: string): number | null {
  const lower = unit.toLowerCase();
  const entry = CONVERSIONS[lower];
  if (!entry) return null;
  const base = Object.keys(entry)[0];
  return value / entry[base];
}

function convertTemperature(value: number, from: string, to: string): number | null {
  const f = from.toLowerCase(), t = to.toLowerCase();
  let celsius: number;
  if (f === "c" || f === "celsius") celsius = value;
  else if (f === "f" || f === "fahrenheit") celsius = (value - 32) * 5 / 9;
  else if (f === "k" || f === "kelvin") celsius = value - 273.15;
  else return null;

  if (t === "c" || t === "celsius") return celsius;
  if (t === "f" || t === "fahrenheit") return celsius * 9 / 5 + 32;
  if (t === "k" || t === "kelvin") return celsius + 273.15;
  return null;
}

server.tool(
  "convert-units",
  "Convert between units. Supports length (mm,cm,m,km,in,ft,yd,mi), weight (mg,g,kg,oz,lb,ton), volume (ml,l,gal,qt,pt,cup,floz), data (b,kb,mb,gb,tb), time (ms,s,min,hr,day,week), temperature (c,f,k).",
  {
    value: z.number().describe("Value to convert"),
    from: z.string().describe("Source unit"),
    to: z.string().describe("Target unit"),
  },
  async ({ value, from, to }) => {
    // Try temperature first
    const tempResult = convertTemperature(value, from, to);
    if (tempResult !== null) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          input: { value, unit: from },
          output: { value: Math.round(tempResult * 1e10) / 1e10, unit: to },
          formula: `${value} ${from} = ${Math.round(tempResult * 1e10) / 1e10} ${to}`,
        }, null, 2) }],
      };
    }

    const baseFrom = toBase(value, from);
    if (!baseFrom) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown unit: ${from}`, supportedUnits: Object.keys(CONVERSIONS) }) }] };
    }
    const baseToUnit = getBaseUnit(to);
    if (!baseToUnit) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown unit: ${to}`, supportedUnits: Object.keys(CONVERSIONS) }) }] };
    }
    if (baseFrom.base !== baseToUnit) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Cannot convert ${from} to ${to}: incompatible unit types` }) }] };
    }

    const result = fromBase(baseFrom.value, to);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        input: { value, unit: from },
        output: { value: Math.round(result! * 1e10) / 1e10, unit: to },
        formula: `${value} ${from} = ${Math.round(result! * 1e10) / 1e10} ${to}`,
      }, null, 2) }],
    };
  }
);

startServer(server);
