import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export interface ToolServerOptions {
  name: string;
  version: string;
  description?: string;
}

export function createToolServer(options: ToolServerOptions): McpServer {
  return new McpServer({
    name: options.name,
    version: options.version,
  });
}

export async function startServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
