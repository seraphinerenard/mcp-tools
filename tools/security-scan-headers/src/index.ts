#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/security-scan-headers",
  version: "0.1.0",
});

interface HeaderCheck {
  header: string;
  present: boolean;
  value?: string;
  status: "pass" | "warn" | "fail";
  recommendation: string;
}

const SECURITY_HEADERS: Array<{
  name: string;
  required: boolean;
  recommendation: string;
  validate?: (value: string) => boolean;
}> = [
  {
    name: "Strict-Transport-Security",
    required: true,
    recommendation: "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains",
    validate: (v) => v.includes("max-age="),
  },
  {
    name: "Content-Security-Policy",
    required: true,
    recommendation: "Add a Content-Security-Policy header to prevent XSS attacks",
  },
  {
    name: "X-Content-Type-Options",
    required: true,
    recommendation: "Add: X-Content-Type-Options: nosniff",
    validate: (v) => v.toLowerCase() === "nosniff",
  },
  {
    name: "X-Frame-Options",
    required: true,
    recommendation: "Add: X-Frame-Options: DENY or SAMEORIGIN",
    validate: (v) => ["deny", "sameorigin"].includes(v.toLowerCase()),
  },
  {
    name: "X-XSS-Protection",
    required: false,
    recommendation: "Consider: X-XSS-Protection: 0 (rely on CSP instead)",
  },
  {
    name: "Referrer-Policy",
    required: true,
    recommendation: "Add: Referrer-Policy: strict-origin-when-cross-origin",
  },
  {
    name: "Permissions-Policy",
    required: false,
    recommendation: "Consider adding Permissions-Policy to restrict browser features",
  },
  {
    name: "Cross-Origin-Opener-Policy",
    required: false,
    recommendation: "Consider: Cross-Origin-Opener-Policy: same-origin",
  },
  {
    name: "Cross-Origin-Resource-Policy",
    required: false,
    recommendation: "Consider: Cross-Origin-Resource-Policy: same-origin",
  },
  {
    name: "Cross-Origin-Embedder-Policy",
    required: false,
    recommendation: "Consider: Cross-Origin-Embedder-Policy: require-corp",
  },
];

const INSECURE_HEADERS = [
  { name: "Server", recommendation: "Remove or minimize Server header to avoid information disclosure" },
  { name: "X-Powered-By", recommendation: "Remove X-Powered-By header to avoid information disclosure" },
  { name: "X-AspNet-Version", recommendation: "Remove X-AspNet-Version header" },
  { name: "X-AspNetMvc-Version", recommendation: "Remove X-AspNetMvc-Version header" },
];

server.tool(
  "security-scan-headers",
  "Scan a URL's HTTP response headers for security best practices. Reports missing headers, insecure configurations, and recommendations.",
  {
    url: z.string().url().describe("URL to scan for security headers"),
  },
  async ({ url }) => {
    requireString(url, "url");

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const checks: HeaderCheck[] = [];
    let score = 0;
    let maxScore = 0;

    for (const header of SECURITY_HEADERS) {
      const value = response.headers.get(header.name);
      const present = value !== null;
      let status: "pass" | "warn" | "fail";

      if (header.required) {
        maxScore += 10;
        if (!present) {
          status = "fail";
        } else if (header.validate && !header.validate(value!)) {
          status = "warn";
          score += 5;
        } else {
          status = "pass";
          score += 10;
        }
      } else {
        maxScore += 5;
        status = present ? "pass" : "warn";
        if (present) score += 5;
      }

      checks.push({
        header: header.name,
        present,
        value: value || undefined,
        status,
        recommendation: status === "pass" ? "OK" : header.recommendation,
      });
    }

    const leaks: HeaderCheck[] = [];
    for (const insecure of INSECURE_HEADERS) {
      const value = response.headers.get(insecure.name);
      if (value) {
        leaks.push({
          header: insecure.name,
          present: true,
          value,
          status: "warn",
          recommendation: insecure.recommendation,
        });
      }
    }

    const grade =
      score >= maxScore * 0.9 ? "A" :
      score >= maxScore * 0.7 ? "B" :
      score >= maxScore * 0.5 ? "C" :
      score >= maxScore * 0.3 ? "D" : "F";

    const result = {
      url,
      grade,
      score: `${score}/${maxScore}`,
      securityHeaders: checks,
      informationLeaks: leaks,
      summary: {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: checks.filter((c) => c.status === "warn").length + leaks.length,
        fail: checks.filter((c) => c.status === "fail").length,
      },
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
