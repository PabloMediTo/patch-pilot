const ASSET_PATH = "/assets/run-review.css";

const REVIEW_STYLES = `:root {
  color-scheme: dark;
  --bg: #0b1020;
  --surface: #121a2e;
  --surface-raised: #19243c;
  --border: #293754;
  --text: #eef3ff;
  --muted: #9eacc7;
  --accent: #7dd3fc;
  --success: #86efac;
  --danger: #fda4af;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
}

* { box-sizing: border-box; }

body {
  min-width: 20rem;
  margin: 0;
  background: radial-gradient(circle at top right, #172554 0, transparent 34rem), var(--bg);
}

main {
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 3rem 0 5rem;
}

.run-header { margin-bottom: 2rem; }
.eyebrow { margin: 0 0 .5rem; color: var(--accent); font-size: .75rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.75rem); letter-spacing: -.04em; }
.status { display: inline-flex; margin-top: 1rem; padding: .4rem .75rem; border: 1px solid #36527a; border-radius: 999px; background: #162744; color: #bae6fd; font: 700 .8rem ui-monospace, monospace; }

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

section, .notice {
  min-width: 0;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  box-shadow: 0 1.25rem 3rem rgb(0 0 0 / 18%);
}

.wide { grid-column: 1 / -1; }
h2 { margin: 0 0 1rem; font-size: 1rem; letter-spacing: .04em; text-transform: uppercase; }
ol { margin: 0; padding-left: 1.4rem; color: var(--muted); }
li + li { margin-top: .65rem; }
li strong { color: var(--text); }
time { color: var(--muted); font: .75rem ui-monospace, monospace; }

pre {
  max-height: 28rem;
  margin: 0;
  padding: 1rem;
  overflow: auto;
  border: 1px solid #22304b;
  border-radius: .75rem;
  background: #080d19;
  color: #dbeafe;
  font: .78rem/1.65 ui-monospace, SFMono-Regular, Consolas, monospace;
}

pre span { display: block; min-width: max-content; padding: 0 .4rem; }
.addition { background: rgb(34 197 94 / 13%); color: var(--success); }
.deletion { background: rgb(244 63 94 / 13%); color: var(--danger); }
code { color: var(--accent); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }

.approval-actions { display: flex; flex-wrap: wrap; gap: .75rem; align-items: flex-end; }
form { margin: 0; }
label { display: grid; gap: .4rem; color: var(--muted); font-size: .8rem; font-weight: 700; }
textarea { min-width: min(22rem, 70vw); min-height: 4.75rem; padding: .7rem; resize: vertical; border: 1px solid var(--border); border-radius: .6rem; background: #080d19; color: var(--text); }
button { padding: .7rem 1rem; border: 0; border-radius: .6rem; background: var(--success); color: #052e16; font-weight: 800; cursor: pointer; }
.reject button { background: transparent; color: var(--danger); outline: 1px solid #9f3048; }
button:hover { filter: brightness(1.08); }
button:focus-visible, textarea:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }

@media (max-width: 48rem) {
  main { padding-top: 2rem; }
  .review-grid { grid-template-columns: 1fr; }
  .wide { grid-column: auto; }
}`;

/**
 * Serves the same-origin review stylesheet.
 *
 * @param {{ request: object, response: object }} input HTTP ports.
 * @returns {object} Route outcome.
 */
export function handleRunReviewStyleAsset(input) {
  if (input?.request?.url !== ASSET_PATH) return Object.freeze({ status: "unhandled" });
  if (input.request.method !== "GET") {
    input.response.writeHead(405, { allow: "GET" });
    input.response.end();
    return Object.freeze({ status: "rejected", statusCode: 405 });
  }
  input.response.writeHead(200, {
    "content-type": "text/css; charset=utf-8",
    "cache-control": "public, max-age=3600",
    "x-content-type-options": "nosniff",
  });
  input.response.end(REVIEW_STYLES);
  return Object.freeze({ status: "served" });
}
