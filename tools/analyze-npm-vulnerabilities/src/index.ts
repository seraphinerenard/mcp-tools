#!/usr/bin/env node
import { createToolServer, startServer } from "@mcp-tools/core";
import { z } from "zod";
import { execSync } from "node:child_process";

const server = createToolServer({
  name: "@mcp-tools/analyze-npm-vulnerabilities",
  version: "0.1.0",
});

interface VulnSummary {
  package: string;
  severity: string;
  title: string;
  url: string;
  range: string;
}

function parseAuditOutput(raw: string): { vulnerabilities: VulnSummary[]; summary: Record<string, number> } {
  try {
    const data = JSON.parse(raw);
    const vulns: VulnSummary[] = [];
    const summary: Record<string, number> = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };

    if (data.vulnerabilities) {
      for (const [name, info] of Object.entries(data.vulnerabilities)) {
        const v = info as Record<string, unknown>;
        const severity = (v.severity as string) || "unknown";
        summary[severity] = (summary[severity] || 0) + 1;
        vulns.push({
          package: name,
          severity,
          title: (v.title as string) || (v.name as string) || name,
          url: (v.url as string) || "",
          range: (v.range as string) || (v.vulnerable_versions as string) || "*",
        });
      }
    }

    return { vulnerabilities: vulns, summary };
  } catch {
    return { vulnerabilities: [], summary: {} };
  }
}

server.tool(
  "analyze-npm-vulnerabilities",
  "Analyze npm dependencies for known security vulnerabilities. Provide a package.json or a project directory path.",
  {
    packageJson: z.string().optional().describe("Contents of package.json as a JSON string"),
    directory: z.string().optional().describe("Path to a project directory containing package-lock.json"),
  },
  async ({ packageJson, directory }) => {
    let result: string;

    if (directory) {
      try {
        const raw = execSync("npm audit --json 2>/dev/null || true", {
          cwd: directory,
          encoding: "utf-8",
          timeout: 30000,
        });
        const parsed = parseAuditOutput(raw);
        result = JSON.stringify(parsed, null, 2);
      } catch (err) {
        result = JSON.stringify({
          error: `Failed to run npm audit: ${err instanceof Error ? err.message : String(err)}`,
          hint: "Ensure the directory contains a package-lock.json file",
        });
      }
    } else if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const depList = Object.entries(deps).map(
          ([name, version]) => `${name}@${version}`
        );

        const checks = depList.map((dep) => {
          try {
            const raw = execSync(`npm audit --json --package "${dep}" 2>/dev/null || true`, {
              encoding: "utf-8",
              timeout: 10000,
            });
            return { dep, audit: raw };
          } catch {
            return { dep, audit: null };
          }
        });

        result = JSON.stringify({
          analyzed: depList.length,
          dependencies: Object.keys(deps),
          note: "For full vulnerability analysis, provide a directory with package-lock.json",
          checks: checks.filter((c) => c.audit).length,
        }, null, 2);
      } catch {
        result = JSON.stringify({ error: "Invalid package.json content" });
      }
    } else {
      result = JSON.stringify({
        error: "Provide either packageJson or directory parameter",
      });
    }

    return {
      content: [{ type: "text" as const, text: result }],
    };
  }
);

startServer(server);
