import type { FileAnalysis, Severity } from "../analyzers/types";

interface RoadmapItem {
  filePath: string;
  reason: string;
  priority: Severity;
}

interface RoadmapPhase {
  dimension: string;
  label: string;
  items: RoadmapItem[];
}

export interface Roadmap {
  phases: RoadmapPhase[];
}

const PHASE_ORDER = [
  { dimension: "hiddenContext", label: "Phase 1: Eliminate hidden context" },
  { dimension: "documentation", label: "Phase 2: Add missing documentation" },
  { dimension: "naming", label: "Phase 3: Improve naming" },
  { dimension: "structure", label: "Phase 4: Normalize structure" },
  { dimension: "coupling", label: "Phase 5: Reduce coupling" },
  { dimension: "testCoverage", label: "Phase 6: Improve test quality" },
];

export function generateRoadmap(files: FileAnalysis[]): Roadmap {
  const phases: RoadmapPhase[] = [];

  for (const { dimension, label } of PHASE_ORDER) {
    const items: RoadmapItem[] = [];
    for (const file of files) {
      const dim = file.dimensions[dimension];
      if (dim && dim.score > 0.2 && dim.evidence.length > 0) {
        items.push({
          filePath: file.filePath,
          reason: dim.evidence.map(e => e.explanation).join("; "),
          priority: dim.score >= 0.7 ? "critical" : dim.score >= 0.5 ? "high" : "medium",
        });
      }
    }
    if (items.length > 0) {
      items.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      });
      phases.push({ dimension, label, items });
    }
  }

  return { phases };
}
