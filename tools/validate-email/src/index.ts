#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/validate-email", version: "0.1.0" });

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "maildrop.cc", "trashmail.com",
]);

function validateEmail(email: string) {
  const issues: string[] = [];
  const trimmed = email.trim();

  if (trimmed.length === 0) return { valid: false, issues: ["Empty email address"] };
  if (trimmed.length > 254) issues.push("Email exceeds maximum length of 254 characters");

  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return { valid: false, issues: ["Missing @ symbol"], parts: null };
  if (atIndex === 0) issues.push("Local part is empty");

  const local = trimmed.substring(0, atIndex);
  const domain = trimmed.substring(atIndex + 1);

  if (local.length > 64) issues.push("Local part exceeds 64 characters");
  if (local.startsWith(".") || local.endsWith(".")) issues.push("Local part starts or ends with a dot");
  if (local.includes("..")) issues.push("Local part contains consecutive dots");

  if (domain.length === 0) issues.push("Domain is empty");
  if (!domain.includes(".")) issues.push("Domain has no TLD");
  if (domain.startsWith("-") || domain.endsWith("-")) issues.push("Domain starts or ends with hyphen");

  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (domain && !domainRegex.test(domain)) issues.push("Domain format is invalid");

  const isDisposable = DISPOSABLE_DOMAINS.has(domain.toLowerCase());
  if (isDisposable) issues.push("Domain is a known disposable email provider");

  const localRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (local && !localRegex.test(local)) issues.push("Local part contains invalid characters");

  return {
    valid: issues.length === 0,
    email: trimmed,
    parts: { local, domain, tld: domain.split(".").pop() || "" },
    isDisposable,
    issues,
  };
}

server.tool(
  "validate-email",
  "Validate one or more email addresses. Checks format, domain, and detects disposable email providers.",
  {
    emails: z.array(z.string()).min(1).describe("Email addresses to validate"),
  },
  async ({ emails }) => {
    const results = emails.map(validateEmail);
    const validCount = results.filter(r => r.valid).length;
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        total: results.length,
        valid: validCount,
        invalid: results.length - validCount,
        results,
      }, null, 2) }],
    };
  }
);

startServer(server);
