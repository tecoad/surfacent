import type { Annotation } from "../types";
import { hasChanges } from "../design/aspects";
import { composeComment, guideFor } from "../design/prompt";

/** The feedback line: the user's note, or the design instruction plus the note. */
function feedbackLines(a: Annotation): string {
  if (!hasChanges(a.aspects)) return `**Feedback:** ${a.comment}\n`;
  return `**Change:**\n${composeComment(a)
    .split("\n")
    .map((line) => `- ${line}`)
    .join("\n")}\n`;
}

function generateOutputHeader(pathname: string, appName?: string): string {
  let output = `## Page Feedback: ${pathname}\n`;
  const name = appName?.replace(/[\r\n\t]+/g, " ").trim();
  if (name) output += `**App:** ${name.replace(/[\\`*_[\]<>]/g, "\\$&")}\n`;
  return output;
}

export function generateOutput(
  annotations: Annotation[],
  pathname: string,
  options: { appName?: string } = {},
): string {
  if (annotations.length === 0) return "";

  const viewport =
    typeof window !== "undefined"
      ? `${window.innerWidth}×${window.innerHeight}`
      : "unknown";

  let output = generateOutputHeader(pathname, options.appName);
  output += `**Viewport:** ${viewport}\n\n`;

  const guide = guideFor(annotations);
  if (guide) output += `${guide}\n---\n\n`;

  annotations.forEach((a, i) => {
    output += `### ${i + 1}. ${a.element}\n`;
    output += `**Location:** ${a.elementPath}\n`;
    if (a.sourceFile) output += `**Source:** ${a.sourceFile}\n`;
    if (a.selectedText) output += `**Selected text:** "${a.selectedText}"\n`;
    output += `${feedbackLines(a)}\n`;
  });

  return output.trim();
}
