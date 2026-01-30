#!/usr/bin/env node
import { createToolServer, startServer, parseJsonSafe } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/validate-openapi",
  version: "0.1.0",
});

interface ValidationIssue {
  path: string;
  severity: "error" | "warning";
  message: string;
}

function validateOpenAPI(spec: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check required top-level fields
  if (!spec.openapi && !spec.swagger) {
    issues.push({ path: "/", severity: "error", message: "Missing 'openapi' or 'swagger' version field" });
  }

  const version = (spec.openapi || spec.swagger) as string;
  if (version && typeof version === "string") {
    if (!version.match(/^[23]\.\d+\.\d+$/)) {
      issues.push({ path: "/openapi", severity: "error", message: `Invalid version format: ${version}` });
    }
  }

  if (!spec.info) {
    issues.push({ path: "/info", severity: "error", message: "Missing required 'info' object" });
  } else {
    const info = spec.info as Record<string, unknown>;
    if (!info.title) issues.push({ path: "/info/title", severity: "error", message: "Missing required 'title'" });
    if (!info.version) issues.push({ path: "/info/version", severity: "error", message: "Missing required 'version'" });
    if (info.description && typeof info.description !== "string") {
      issues.push({ path: "/info/description", severity: "error", message: "'description' must be a string" });
    }
  }

  if (!spec.paths && !spec.webhooks) {
    issues.push({ path: "/paths", severity: "error", message: "Missing 'paths' object" });
  }

  if (spec.paths) {
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const validMethods = ["get", "post", "put", "delete", "patch", "options", "head", "trace"];

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      if (!pathKey.startsWith("/")) {
        issues.push({ path: `/paths/${pathKey}`, severity: "error", message: "Path must start with '/'" });
      }

      // Check for path parameter consistency
      const paramMatches = pathKey.match(/\{([^}]+)\}/g) || [];
      const pathParams = paramMatches.map((m) => m.slice(1, -1));

      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === "parameters" || method === "$ref" || method === "summary" || method === "description") continue;

        if (!validMethods.includes(method)) {
          issues.push({ path: `/paths/${pathKey}/${method}`, severity: "warning", message: `Unknown HTTP method: ${method}` });
          continue;
        }

        const op = operation as Record<string, unknown>;

        if (!op.responses) {
          issues.push({
            path: `/paths/${pathKey}/${method}/responses`,
            severity: "error",
            message: "Missing required 'responses' object",
          });
        } else {
          const responses = op.responses as Record<string, unknown>;
          if (Object.keys(responses).length === 0) {
            issues.push({
              path: `/paths/${pathKey}/${method}/responses`,
              severity: "error",
              message: "Responses object must have at least one response",
            });
          }
          for (const statusCode of Object.keys(responses)) {
            if (!statusCode.match(/^[1-5]\d{2}$/) && statusCode !== "default") {
              issues.push({
                path: `/paths/${pathKey}/${method}/responses/${statusCode}`,
                severity: "warning",
                message: `Unusual status code: ${statusCode}`,
              });
            }
          }
        }

        // Validate path parameters are defined
        if (op.parameters && Array.isArray(op.parameters)) {
          const definedParams = (op.parameters as Array<Record<string, unknown>>)
            .filter((p) => p.in === "path")
            .map((p) => p.name as string);

          for (const param of pathParams) {
            if (!definedParams.includes(param)) {
              issues.push({
                path: `/paths/${pathKey}/${method}/parameters`,
                severity: "warning",
                message: `Path parameter '{${param}}' not defined in parameters`,
              });
            }
          }
        } else if (pathParams.length > 0) {
          // Check parent parameters
          const parentParams = (pathItem.parameters as Array<Record<string, unknown>> || [])
            .filter((p) => p.in === "path")
            .map((p) => p.name as string);
          for (const param of pathParams) {
            if (!parentParams.includes(param)) {
              issues.push({
                path: `/paths/${pathKey}/${method}`,
                severity: "warning",
                message: `Path parameter '{${param}}' not defined`,
              });
            }
          }
        }

        if (!op.operationId) {
          issues.push({
            path: `/paths/${pathKey}/${method}`,
            severity: "warning",
            message: "Missing 'operationId' (recommended for code generation)",
          });
        }

        if ((method === "post" || method === "put" || method === "patch") && !op.requestBody) {
          issues.push({
            path: `/paths/${pathKey}/${method}`,
            severity: "warning",
            message: `${method.toUpperCase()} operation without 'requestBody'`,
          });
        }
      }
    }
  }

  // Check components/schemas for common issues
  if (spec.components) {
    const components = spec.components as Record<string, unknown>;
    if (components.schemas) {
      const schemas = components.schemas as Record<string, Record<string, unknown>>;
      for (const [name, schema] of Object.entries(schemas)) {
        if (!schema.type && !schema.$ref && !schema.allOf && !schema.oneOf && !schema.anyOf) {
          issues.push({
            path: `/components/schemas/${name}`,
            severity: "warning",
            message: "Schema missing 'type' or composition keyword",
          });
        }
      }
    }
  }

  return issues;
}

server.tool(
  "validate-openapi",
  "Validate an OpenAPI 3.x or Swagger 2.x specification. Checks structure, required fields, path parameters, and common issues.",
  {
    spec: z.string().describe("OpenAPI specification as a JSON string"),
  },
  async ({ spec }) => {
    const parsed = parseJsonSafe(spec, "spec") as Record<string, unknown>;
    const issues = validateOpenAPI(parsed);

    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");

    const result = {
      valid: errors.length === 0,
      summary: {
        errors: errors.length,
        warnings: warnings.length,
      },
      issues,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
