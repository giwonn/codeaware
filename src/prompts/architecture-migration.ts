import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.registerPrompt("plan_msa_migration", {
    title: "Plan MSA Migration",
    description: "Guide AI to plan monolith → microservices migration based on scan results",
    argsSchema: {
      project_dir: z.string().describe("Project root directory"),
    },
  }, ({ project_dir }) => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `You are an architecture migration expert. Analyze the project at ${project_dir} for microservices decomposition.

Steps:
1. First, call scan_project on "${project_dir}" to understand the current state
2. Identify domain boundaries based on coupling analysis and file clustering
3. Rank decomposition candidates by: lowest coupling to other domains first
4. For each candidate service, specify:
   - Files to extract
   - APIs to expose (replacing direct imports)
   - Shared state to eliminate
   - Migration order (least coupled first)
5. Flag any Level 5-6 files that need hidden context documentation BEFORE migration

Output a phased migration plan with estimated risk per phase.`,
      },
    }],
  }));

  server.registerPrompt("plan_eda_migration", {
    title: "Plan EDA Migration",
    description: "Guide AI to plan event-driven architecture migration",
    argsSchema: {
      project_dir: z.string().describe("Project root directory"),
    },
  }, ({ project_dir }) => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `You are an event-driven architecture expert. Analyze the project at ${project_dir} for EDA migration.

Steps:
1. Call scan_project on "${project_dir}" to understand coupling patterns
2. Identify synchronous call chains that should become async events
3. Map current direct dependencies to event producer/consumer pairs
4. Define event schema for each identified event
5. Propose migration order: start with fire-and-forget events, then request-reply
6. Flag hidden context dependencies that could cause event handling bugs

Output an event catalog and phased migration plan.`,
      },
    }],
  }));

  server.registerPrompt("analyze_domain_boundaries", {
    title: "Analyze Domain Boundaries",
    description: "Guide AI to analyze domain boundaries for DDD",
    argsSchema: {
      project_dir: z.string().describe("Project root directory"),
    },
  }, ({ project_dir }) => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `You are a domain-driven design expert. Analyze the project at ${project_dir} for domain boundaries.

Steps:
1. Call scan_project on "${project_dir}" to get coupling and structure data
2. Cluster files by import relationships and naming patterns
3. Identify bounded contexts: groups of files that change together and share vocabulary
4. Map context relationships: shared kernel, customer-supplier, conformist, anti-corruption layer
5. Flag files that cross multiple contexts (candidates for refactoring)
6. Check for hidden context that may indicate undocumented domain rules

Output a context map with relationship types and boundary recommendations.`,
      },
    }],
  }));

  server.registerPrompt("guide_refactoring", {
    title: "Guide Safe Refactoring",
    description: "Guide AI to safely refactor a file using discovered hidden context",
    argsSchema: {
      project_dir: z.string().describe("Project root directory"),
      file_path: z.string().describe("File to refactor"),
    },
  }, ({ project_dir, file_path }) => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `You are a careful refactoring expert. Refactor the file "${file_path}" safely.

CRITICAL WORKFLOW:
1. Call scan_file on "${file_path}" to understand the current state
2. Call discover_context on "${file_path}" to see what hidden context exists
3. Check if context has been saved by reading "${project_dir}/.codeaware/context.json"
4. For any hidden context signal WITHOUT a saved answer:
   - ASK THE USER about it before proceeding
   - Save the answer using save_context
5. Only after ALL hidden context is documented, proceed with refactoring

REFACTORING RULES:
- Never change magic numbers without understanding their meaning from saved context
- Never reorder initialization without confirming order-independence from saved context
- Never simplify catch blocks without understanding the failure scenarios from saved context
- Add comments documenting the hidden context you discovered (from saved answers)
- Each refactoring step should be a small, reversible change

Output your refactoring plan as numbered steps, each referencing the specific context that makes it safe.`,
      },
    }],
  }));
}
