# Docs Decisions

## `_index.md` Owns Routing

The repository uses `_index.md` instead of `README.md` for docs navigation so routing metadata stays separate from human-oriented explanation.

## `README.md` Owns The Mental Model

Each docs folder now uses `README.md` as the human entrypoint. This makes the file name familiar and predictable without overloading it with routing duties.

## `_status.md` And `_decisions.md` Are Special-Purpose Docs

Current-state information and rationale change at different rates and for different reasons. Keeping them out of `README.md` reduces drift and makes it clearer where to update the truth.
