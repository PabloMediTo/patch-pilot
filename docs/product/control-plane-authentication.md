# Control-Plane Authentication

## Responsibility

Authenticate the single human operator permitted to inspect runs and submit [approval decisions](../DICTIONARY.md#approval-decision) through the [control-plane API](../DICTIONARY.md#control-plane-api).

## Not responsible for

- provisioning users, teams, sessions, or browser cookies
- deciding whether a valid operator may access only a subset of runs
- authenticating GitHub App webhook deliveries
- storing the bearer credential or actor identity in Postgres

## Inputs

- `PATCH_PILOT_API_BEARER_TOKEN`, containing a whitespace-free secret of at least 32 characters
- `PATCH_PILOT_API_ACTOR_ID`, containing the stable audit identity for the operator
- a scalar HTTP `Authorization: Bearer <token>` header

## Outputs

- an authenticated immutable actor for approval commands
- a run-access authorization decision for review evidence and timeline routes
- no actor and denied access when the credential is missing, malformed, or incorrect

## Adjacent parts

- the API application runtime supplies deployment environment values and shares these ports across review, timeline, and approval roles
- the web server forwards an existing browser bearer credential but does not interpret it
- GitHub webhook ingestion uses its independent HMAC secret and authentication path

## MVP security boundary

The implemented adapter deliberately models one deployment operator rather than a user database. Bearer scheme matching is case-insensitive, while the credential has no surrounding whitespace or alternate transport. Supplied and configured tokens are reduced to fixed-length SHA-256 digests and compared with a timing-safe primitive. Errors validate configuration names and constraints without including secret values.

The application runtime now constructs this adapter from deployment values and gives the concrete server one shared authentication source. Individual review, timeline, or approval integrations cannot replace it with route-specific authentication ports. Environment-backed Postgres, Redis, review-evidence, listener, and lifecycle composition remain separate work in the executable main process.
