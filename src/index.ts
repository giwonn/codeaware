#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scanFile } from "./tools/scan-file";
import { scanProjectTool } from "./tools/scan-project";
import { getImprovementRoadmap } from "./tools/get-improvement-roadmap";
import { registerPrompts } from "./prompts/architecture-migration";

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

server.registerTool("scan_project", {
  title: "Scan Project",
  description: "Analyze an entire project for AI comprehensibility. Returns overall level (1-6), level distribution, and worst files.",
  inputSchema: {
    root_dir: z.string().describe("Root directory of the project to scan"),
  },
}, async ({ root_dir }) => {
  const result = await scanProjectTool(root_dir);
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
});

server.registerTool("get_improvement_roadmap", {
  title: "Get Improvement Roadmap",
  description: "Generate a prioritized improvement roadmap for a project. Hidden context elimination comes first.",
  inputSchema: {
    root_dir: z.string().describe("Root directory of the project"),
  },
}, async ({ root_dir }) => {
  const roadmap = await getImprovementRoadmap(root_dir);
  return { content: [{ type: "text" as const, text: JSON.stringify(roadmap, null, 2) }] };
});

registerPrompts(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("codeaware server started on stdio");
