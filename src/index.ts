#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve } from "path";
import { existsSync } from "fs";
import { scanFile } from "./tools/scan-file";
import { scanProjectTool } from "./tools/scan-project";
import { getImprovementRoadmap } from "./tools/get-improvement-roadmap";
import { registerPrompts } from "./prompts/architecture-migration";
import { discoverContext } from "./tools/discover-context";
import { saveContextAnswer } from "./tools/save-context";

function validatePath(inputPath: string): string {
  const resolved = resolve(inputPath);
  if (resolved.includes("\0")) throw new Error("Invalid path: null bytes");
  if (!existsSync(resolved)) throw new Error(`Path does not exist: ${resolved}`);
  return resolved;
}

function validateDir(inputPath: string): string {
  const resolved = resolve(inputPath);
  if (resolved.includes("\0")) throw new Error("Invalid path: null bytes");
  if (!existsSync(resolved)) throw new Error(`Directory does not exist: ${resolved}`);
  return resolved;
}

function errorResponse(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
}

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
  try {
    const resolved = validatePath(file_path);
    const result = await scanFile(resolved);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
});

server.registerTool("scan_project", {
  title: "Scan Project",
  description: "Analyze an entire project for AI comprehensibility. Returns overall level (1-6), level distribution, and worst files.",
  inputSchema: {
    root_dir: z.string().describe("Root directory of the project to scan"),
  },
}, async ({ root_dir }) => {
  try {
    const resolved = validateDir(root_dir);
    const result = await scanProjectTool(resolved);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
});

server.registerTool("get_improvement_roadmap", {
  title: "Get Improvement Roadmap",
  description: "Generate a prioritized improvement roadmap for a project. Hidden context elimination comes first.",
  inputSchema: {
    root_dir: z.string().describe("Root directory of the project"),
  },
}, async ({ root_dir }) => {
  try {
    const resolved = validateDir(root_dir);
    const roadmap = await getImprovementRoadmap(resolved);
    return { content: [{ type: "text" as const, text: JSON.stringify(roadmap, null, 2) }] };
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
});

server.registerTool("discover_context", {
  title: "Discover Hidden Context",
  description: "Analyze a file and generate questions to uncover hidden context. Use before refactoring to identify what the AI doesn't know about the code.",
  inputSchema: {
    file_path: z.string().describe("Path to the file to analyze"),
  },
}, async ({ file_path }) => {
  try {
    const resolved = validatePath(file_path);
    const questions = await discoverContext(resolved);
    if (questions.length === 0) {
      return { content: [{ type: "text" as const, text: "No hidden context detected. This file is safe for AI-driven refactoring." }] };
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(questions, null, 2) }] };
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
});

server.registerTool("save_context", {
  title: "Save Context Answer",
  description: "Save a user's answer about hidden context. Call this after the user answers a question from discover_context.",
  inputSchema: {
    project_dir: z.string().describe("Project root directory"),
    question_id: z.string().describe("ID from the discover_context question"),
    file_path: z.string().describe("File path the question is about"),
    line: z.number().describe("Line number"),
    signal: z.string().describe("Signal type"),
    question: z.string().describe("The original question"),
    answer: z.string().describe("The user's answer"),
  },
}, async ({ project_dir, question_id, file_path, line, signal, question, answer }) => {
  try {
    const resolvedDir = validateDir(project_dir);
    const result = await saveContextAnswer(resolvedDir, question_id, file_path, line, signal, question, answer);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e));
  }
});

registerPrompts(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("codeaware server started on stdio");
