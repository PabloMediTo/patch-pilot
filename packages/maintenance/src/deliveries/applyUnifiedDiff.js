const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/u;
const DIFF_HEADER = /^diff --git a\/(\S+) b\/(\S+)$/u;
const SAFE_MODE = /^(?:100644|100755)$/u;

/**
 * Parses and applies one bounded text-only Git unified diff.
 *
 * @param {string} sourceDiff Exact approved Git unified diff.
 * @param {Map<string, { content: string, mode: string }>} baseFiles Changed base files by path.
 * @returns {object[]} Tree changes with complete new text or a deletion marker.
 */
export function applyUnifiedDiff(sourceDiff, baseFiles) {
  if (typeof sourceDiff !== "string" || sourceDiff.trim() === "" || sourceDiff.includes("\0")
    || !(baseFiles instanceof Map)) {
    throw new Error("Commit publication requires a unified diff and base files.");
  }
  const patches = parseFilePatches(sourceDiff);
  return Object.freeze(patches.map((patch) => applyFilePatch(patch, baseFiles)));
}

/** Parses every file section and rejects unsupported Git patch metadata. */
function parseFilePatches(sourceDiff) {
  const lines = sourceDiff.split("\n");
  const patches = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index] === "") { index += 1; continue; }
    const parsed = parseDiffSection(lines, index);
    patches.push(parsed.patch);
    index = parsed.nextIndex;
  }
  if (patches.length === 0 || new Set(patches.map(({ path }) => path)).size !== patches.length) {
    throw new Error("Commit publication requires unique file patches.");
  }
  return patches;
}

/** Validates one diff header before parsing its file section. */
function parseDiffSection(lines, index) {
  const header = DIFF_HEADER.exec(lines[index]);
  if (header === null || header[1] !== header[2]) {
    throw new Error("Commit publication supports only same-path text patches.");
  }
  return parseFilePatch(lines, index + 1, normalizePath(header[1]));
}

/** Parses metadata and hunks for one file until the next diff header. */
function parseFilePatch(lines, startIndex, path) {
  const patch = { path, isNew: false, isDeleted: false, newMode: null, hunks: [] };
  let index = startIndex;
  while (index < lines.length && !lines[index].startsWith("diff --git ")) {
    const line = lines[index];
    if (line.startsWith("new file mode ")) setNewFileMode(patch, line.slice(14));
    else if (line.startsWith("deleted file mode ")) setDeletedFileMode(patch, line.slice(18));
    else if (line.startsWith("@@ ")) {
      const parsed = parseHunk(lines, index);
      patch.hunks.push(parsed.hunk);
      index = parsed.nextIndex;
      continue;
    } else if (!isAllowedMetadata(line, path)) {
      throw new Error("Commit publication encountered unsupported patch metadata.");
    }
    index += 1;
  }
  if (patch.hunks.length === 0 || (patch.isNew && patch.isDeleted)) {
    throw new Error("Every published file patch requires a valid text hunk.");
  }
  return { patch: Object.freeze(patch), nextIndex: index };
}

/** Accepts only metadata that cannot rename, copy, or encode binary content. */
function isAllowedMetadata(line, path) {
  return line === "" || /^index [0-9a-f]+\.\.[0-9a-f]+(?: [0-7]{6})?$/u.test(line)
    || line === `--- a/${path}` || line === `+++ b/${path}`
    || line === "--- /dev/null" || line === "+++ /dev/null";
}

/** Records one supported regular-file creation mode. */
function setNewFileMode(patch, mode) {
  if (!SAFE_MODE.test(mode) || patch.isNew) throw new Error("New file mode is unsupported.");
  patch.isNew = true;
  patch.newMode = mode;
}

/** Records one supported regular-file deletion mode. */
function setDeletedFileMode(patch, mode) {
  if (!SAFE_MODE.test(mode) || patch.isDeleted) throw new Error("Deleted file mode is unsupported.");
  patch.isDeleted = true;
}

/** Parses one hunk and validates its declared old and new line counts. */
function parseHunk(lines, startIndex) {
  const header = HUNK_HEADER.exec(lines[startIndex]);
  if (header === null) throw new Error("Unified diff contains a malformed hunk header.");
  const hunk = { oldStart: Number(header[1]), oldCount: Number(header[2] ?? 1),
    newStart: Number(header[3]), newCount: Number(header[4] ?? 1), lines: [] };
  let index = startIndex + 1;
  while (index < lines.length && !lines[index].startsWith("diff --git ")
    && !lines[index].startsWith("@@ ")) {
    const line = lines[index];
    if (line === "\\ No newline at end of file") markPreviousLineWithoutNewline(hunk);
    else if ([" ", "+", "-"].includes(line[0])) {
      hunk.lines.push({ kind: line[0], text: line.slice(1), hasNewline: true });
    } else if (line !== "" || index !== lines.length - 1) {
      throw new Error("Unified diff contains an invalid hunk line.");
    }
    index += 1;
  }
  assertHunkCounts(hunk);
  return { hunk: Object.freeze(hunk), nextIndex: index };
}

/** Applies Git's explicit missing-final-newline marker to its preceding line. */
function markPreviousLineWithoutNewline(hunk) {
  const previous = hunk.lines.at(-1);
  if (previous === undefined || previous.hasNewline === false) {
    throw new Error("Unified diff has a misplaced newline marker.");
  }
  previous.hasNewline = false;
}

/** Checks that hunk metadata agrees with its actual operations. */
function assertHunkCounts(hunk) {
  const oldCount = hunk.lines.filter(({ kind }) => kind !== "+").length;
  const newCount = hunk.lines.filter(({ kind }) => kind !== "-").length;
  if (oldCount !== hunk.oldCount || newCount !== hunk.newCount) {
    throw new Error("Unified diff hunk line counts do not match its header.");
  }
}

/** Applies one parsed file patch against its exact base text. */
function applyFilePatch(patch, baseFiles) {
  const base = baseFiles.get(patch.path);
  if ((patch.isNew && base !== undefined) || (!patch.isNew && base === undefined)) {
    throw new Error("Unified diff file state does not match the base tree.");
  }
  if (base !== undefined && !SAFE_MODE.test(base.mode)) {
    throw new Error("Commit publication supports only regular text files.");
  }
  const baseLines = splitTextLines(base?.content ?? "");
  const resultLines = applyHunks(baseLines, patch.hunks);
  if (patch.isDeleted && resultLines.length !== 0) {
    throw new Error("Deleted file patch must remove the complete file.");
  }
  return Object.freeze({ path: patch.path, mode: patch.newMode ?? base?.mode ?? "100644",
    content: patch.isDeleted ? null : resultLines.join("") });
}

/** Applies ordered, non-overlapping hunks with exact context matching. */
function applyHunks(baseLines, hunks) {
  const output = [];
  let baseIndex = 0;
  let previousNewEnd = 0;
  for (const hunk of hunks) {
    const targetIndex = hunk.oldStart === 0 ? 0 : hunk.oldStart - 1;
    if (targetIndex < baseIndex || hunk.newStart < previousNewEnd) {
      throw new Error("Unified diff hunks must be ordered and non-overlapping.");
    }
    output.push(...baseLines.slice(baseIndex, targetIndex));
    baseIndex = applyHunkLines(baseLines, output, { targetIndex, lines: hunk.lines });
    previousNewEnd = hunk.newStart + hunk.newCount;
  }
  output.push(...baseLines.slice(baseIndex));
  return output;
}

/** Applies one hunk while matching every context and deletion byte-for-byte. */
function applyHunkLines(baseLines, output, input) {
  let baseIndex = input.targetIndex;
  for (const line of input.lines) {
    const content = `${line.text}${line.hasNewline ? "\n" : ""}`;
    if (line.kind !== "+" && baseLines[baseIndex] !== content) {
      throw new Error("Unified diff does not apply exactly to the approved base.");
    }
    if (line.kind !== "-") output.push(content);
    if (line.kind !== "+") baseIndex += 1;
  }
  return baseIndex;
}

/** Splits text into lines while retaining every final-newline byte. */
function splitTextLines(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/gu);
  return lines ?? [];
}

/** Normalizes and confines one repository-relative POSIX path. */
function normalizePath(candidate) {
  const segments = candidate.split("/");
  const isUnsafe = segments.some((segment) => segment === "" || segment === "." || segment === "..")
    || candidate.startsWith("/") || candidate.includes("\\");
  if (isUnsafe) throw new Error("Unified diff path must remain inside the repository.");
  return candidate;
}
