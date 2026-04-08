#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scanFile } from "./tools/scan-file";

const server = new McpServer({
  name: "codeaware",
  version: "0.1.0",
});

server.registerTool("scan_file", {
  title: "Scan File",
  description: "Analyze a single file for AI comprehensibility (1-6 scale). Returns level, dimension scores, and evidence.",
  inputSchema: {
    file_path: z.string().describe("Absolute path to the file to analyze"),
  },
}, async ({ file_path }) => {
  const result = await scanFile(file_path);
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("codeaware server started on stdio");
