/**
 * Renders one safe, server-deliverable run review document.
 *
 * @param {object} review Validated review model.
 * @returns {string} Escaped HTML document.
 */
export function renderRunReviewHtml(review) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Run ${escapeHtml(review.run.id)}</title><link rel="stylesheet" href="/assets/run-review.css"></head>
<body><main data-run-id="${escapeHtml(review.run.id)}"><header class="run-header"><p class="eyebrow">Patch Pilot review</p><h1>Maintenance run ${escapeHtml(review.run.id)}</h1><p class="status">${escapeHtml(review.run.status)}</p></header><div class="review-grid">
<section aria-labelledby="timeline"><h2 id="timeline">Timeline</h2><ol data-live-timeline>${renderTimeline(review.timeline)}</ol></section>
<section aria-labelledby="plan"><h2 id="plan">Plan</h2><ol>${renderPlan(review.plan)}</ol></section>
<section class="wide" aria-labelledby="diff"><h2 id="diff">Diff</h2><pre>${renderDiff(review.diff)}</pre></section>
<section class="wide" aria-labelledby="evidence"><h2 id="evidence">Verification: ${escapeHtml(review.verification.status)}</h2>${renderEvidence(review.verification)}</section>
${renderDecision(review)}</div></main><script src="/assets/run-review-live.js" defer></script></body></html>`;
}

/** Renders ordered audit events. */
function renderTimeline(events) {
  return events.map((event) => `<li data-sequence="${event.sequence}"><strong>${escapeHtml(event.type)}</strong> <time>${escapeHtml(event.occurredAt)}</time></li>`).join("");
}

/** Renders the versioned implementation plan. */
function renderPlan(steps) {
  return steps.map((step) => `<li><strong>${escapeHtml(step.path)}</strong>: ${escapeHtml(step.description)}</li>`).join("");
}

/** Renders classified unified-diff lines. */
function renderDiff(lines) {
  return lines.map((line) => `<span class="${line.kind}" data-line="${line.number}">${escapeHtml(line.text)}</span>`).join("\n");
}

/** Renders exact verification command and bounded output. */
function renderEvidence(evidence) {
  const command = [evidence.command.executable, ...evidence.command.args].join(" ");
  return `<p>Command: <code>${escapeHtml(command)}</code></p><p>Exit: ${evidence.exitCode}; Duration: ${evidence.durationMs}ms</p><pre>${escapeHtml(evidence.stdout)}\n${escapeHtml(evidence.stderr)}</pre>`;
}

/** Renders one immutable decision or the available human actions. */
function renderDecision(review) {
  if (review.decision !== null) {
    return `<section class="wide"><h2>Decision</h2><p>${escapeHtml(review.decision.status)}</p></section>`;
  }
  if (review.actions.approve === null) {
    return "<p class=\"notice wide\">Approval is not available for this run state.</p>";
  }
  return `<section class="wide"><h2>Human approval</h2><div class="approval-actions"><form method="post" action="${escapeHtml(review.actions.approve)}"><button>Approve</button></form><form class="reject" method="post" action="${escapeHtml(review.actions.reject)}"><label>Rejection reason <textarea name="reason" required></textarea></label><button>Reject</button></form></div></section>`;
}

/** Escapes untrusted repository and agent content before HTML insertion. */
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
