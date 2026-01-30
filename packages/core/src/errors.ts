import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export class ToolError extends McpError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.InternalError, message, details);
  }
}

export class ValidationError extends McpError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.InvalidParams, message, details);
  }
}

export class InputError extends McpError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.InvalidParams, message, details);
  }
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function wrapToolHandler<T>(
  handler: (args: T) => Promise<string>
): (args: T) => Promise<{ content: Array<{ type: "text"; text: string }> }> {
  return async (args: T) => {
    try {
      const result = await handler(args);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (error) {
      if (error instanceof McpError) throw error;
      const message = formatError(error);
      return { content: [{ type: "text" as const, text: `Error: ${message}` }] };
    }
  };
}
