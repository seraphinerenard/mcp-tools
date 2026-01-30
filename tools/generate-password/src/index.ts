#!/usr/bin/env node
import { createToolServer, startServer } from "@mcp-tools/core";
import { z } from "zod";
import { randomInt } from "node:crypto";

const server = createToolServer({ name: "@mcp-tools/generate-password", version: "0.1.0" });

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

function generatePassword(length: number, options: { lowercase: boolean; uppercase: boolean; digits: boolean; symbols: boolean; excludeAmbiguous: boolean }): string {
  let chars = "";
  if (options.lowercase) chars += LOWER;
  if (options.uppercase) chars += UPPER;
  if (options.digits) chars += DIGITS;
  if (options.symbols) chars += SYMBOLS;

  if (options.excludeAmbiguous) {
    chars = chars.replace(/[0OlI1|]/g, "");
  }

  if (chars.length === 0) chars = LOWER + UPPER + DIGITS;

  const password: string[] = [];
  for (let i = 0; i < length; i++) {
    password.push(chars[randomInt(chars.length)]);
  }
  return password.join("");
}

function calculateEntropy(password: string): number {
  const charsets = [
    { regex: /[a-z]/, size: 26 },
    { regex: /[A-Z]/, size: 26 },
    { regex: /[0-9]/, size: 10 },
    { regex: /[^a-zA-Z0-9]/, size: 32 },
  ];
  let poolSize = 0;
  for (const cs of charsets) {
    if (cs.regex.test(password)) poolSize += cs.size;
  }
  return Math.floor(Math.log2(Math.pow(poolSize, password.length)));
}

function strengthLabel(entropy: number): string {
  if (entropy < 28) return "very weak";
  if (entropy < 36) return "weak";
  if (entropy < 60) return "moderate";
  if (entropy < 128) return "strong";
  return "very strong";
}

server.tool(
  "generate-password",
  "Generate cryptographically secure random passwords with configurable character sets and strength analysis.",
  {
    length: z.number().min(4).max(256).default(16).describe("Password length"),
    count: z.number().min(1).max(20).default(1).describe("Number of passwords to generate"),
    lowercase: z.boolean().default(true).describe("Include lowercase letters"),
    uppercase: z.boolean().default(true).describe("Include uppercase letters"),
    digits: z.boolean().default(true).describe("Include digits"),
    symbols: z.boolean().default(true).describe("Include symbols"),
    excludeAmbiguous: z.boolean().default(false).describe("Exclude ambiguous characters (0, O, l, I, 1, |)"),
  },
  async ({ length, count, lowercase, uppercase, digits, symbols, excludeAmbiguous }) => {
    const passwords = [];
    for (let i = 0; i < count; i++) {
      const pw = generatePassword(length, { lowercase, uppercase, digits, symbols, excludeAmbiguous });
      const entropy = calculateEntropy(pw);
      passwords.push({ password: pw, entropy, strength: strengthLabel(entropy) });
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ count: passwords.length, passwords }, null, 2) }],
    };
  }
);

startServer(server);
