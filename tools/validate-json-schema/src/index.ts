#!/usr/bin/env node
import { createToolServer, startServer, parseJsonSafe } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/validate-json-schema",
  version: "0.1.0",
});

interface SchemaError {
  path: string;
  message: string;
}

function validateValue(value: unknown, schema: Record<string, unknown>, path: string): SchemaError[] {
  const errors: SchemaError[] = [];
  const type = schema.type as string | undefined;

  if (type === "string") {
    if (typeof value !== "string") {
      errors.push({ path, message: `Expected string, got ${typeof value}` });
      return errors;
    }
    if (schema.minLength && (value as string).length < (schema.minLength as number)) {
      errors.push({ path, message: `String length below minimum ${schema.minLength}` });
    }
    if (schema.maxLength && (value as string).length > (schema.maxLength as number)) {
      errors.push({ path, message: `String length exceeds maximum ${schema.maxLength}` });
    }
    if (schema.pattern) {
      const re = new RegExp(schema.pattern as string);
      if (!re.test(value as string)) {
        errors.push({ path, message: `Does not match pattern ${schema.pattern}` });
      }
    }
    if (schema.enum && !(schema.enum as unknown[]).includes(value)) {
      errors.push({ path, message: `Value not in enum: ${JSON.stringify(schema.enum)}` });
    }
  } else if (type === "number" || type === "integer") {
    if (typeof value !== "number") {
      errors.push({ path, message: `Expected ${type}, got ${typeof value}` });
      return errors;
    }
    if (type === "integer" && !Number.isInteger(value)) {
      errors.push({ path, message: "Expected integer" });
    }
    if (schema.minimum !== undefined && (value as number) < (schema.minimum as number)) {
      errors.push({ path, message: `Value below minimum ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && (value as number) > (schema.maximum as number)) {
      errors.push({ path, message: `Value exceeds maximum ${schema.maximum}` });
    }
  } else if (type === "boolean") {
    if (typeof value !== "boolean") {
      errors.push({ path, message: `Expected boolean, got ${typeof value}` });
    }
  } else if (type === "null") {
    if (value !== null) {
      errors.push({ path, message: `Expected null, got ${typeof value}` });
    }
  } else if (type === "array") {
    if (!Array.isArray(value)) {
      errors.push({ path, message: `Expected array, got ${typeof value}` });
      return errors;
    }
    if (schema.minItems !== undefined && value.length < (schema.minItems as number)) {
      errors.push({ path, message: `Array has fewer than ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && value.length > (schema.maxItems as number)) {
      errors.push({ path, message: `Array has more than ${schema.maxItems} items` });
    }
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        errors.push(...validateValue(value[i], schema.items as Record<string, unknown>, `${path}[${i}]`));
      }
    }
  } else if (type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push({ path, message: `Expected object, got ${Array.isArray(value) ? "array" : typeof value}` });
      return errors;
    }
    const obj = value as Record<string, unknown>;
    const properties = (schema.properties || {}) as Record<string, Record<string, unknown>>;
    const required = (schema.required || []) as string[];

    for (const req of required) {
      if (!(req in obj)) {
        errors.push({ path: `${path}.${req}`, message: "Required property missing" });
      }
    }
    for (const [key, propSchema] of Object.entries(properties)) {
      if (key in obj) {
        errors.push(...validateValue(obj[key], propSchema, `${path}.${key}`));
      }
    }
  }

  return errors;
}

server.tool(
  "validate-json-schema",
  "Validate a JSON value against a JSON Schema (draft-07 subset). Returns validation errors.",
  {
    json: z.string().describe("JSON string to validate"),
    schema: z.string().describe("JSON Schema to validate against"),
  },
  async ({ json, schema }) => {
    const value = parseJsonSafe(json, "json");
    const schemaObj = parseJsonSafe(schema, "schema") as Record<string, unknown>;
    const errors = validateValue(value, schemaObj, "$");

    const result = errors.length === 0
      ? { valid: true, errors: [] }
      : { valid: false, errors };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
