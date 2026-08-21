# GitHub Installation Authentication

## Responsibility

Issue short-lived, repository-scoped [GitHub App installation tokens](../DICTIONARY.md#github-app-installation-token) with one explicit permission profile, and reuse them only while they remain outside the refresh window.

## Not responsible for

- deciding which application role needs read or write access
- making GitHub repository API requests
- executing Git commands or retaining repository remotes
- persisting, logging, or publishing credentials as workflow evidence

## Inputs

- the GitHub App ID and RSA private key
- one positive installation ID and `owner/repository` identity
- an explicit non-empty map using only the MVP's `contents` and `pull_requests` permissions at `read` or `write`
- bounded HTTPS transport, clock, timeout, and response-size policy

## Outputs

- one opaque installation token scoped by GitHub to the requested repository and permissions
- an in-memory cache entry that expires from use one minute before GitHub's declared expiration
- one shared refresh promise for concurrent requests to the same installation and repository

## Adjacent parts

- [GitHub run ingestion](github-ingestion.md) composes `contents:read` authentication to resolve the immutable default-branch revision
- the worker's repository-access role composes a separate `contents:read` provider for disposable checkouts
- [GitHub delivery](github-delivery.md) composes `contents:write` and `pull_requests:write` for approved publication
- [repository workspaces](repository-workspaces.md) receive only a complete ephemeral authorization header, never App credentials; GitHub documents the installation token as the HTTP password for Git access in its [App installation authentication guide](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation)

## Credential and cache boundary

The provider signs an RS256 App JWT with 60 seconds of clock-drift allowance and a nine-minute expiration, then exchanges it through GitHub's installation-token endpoint. The request names only the target repository and the caller's exact permission map.

Token strings are treated as opaque. They remain only in process memory, are returned only to the immediate provider adapter, and never appear in URLs or returned errors. Cache identity includes the installation and complete repository identity; independent provider instances keep read-only checkout credentials separate from write-capable delivery credentials.

Fetch duration defaults to 15 seconds and response bodies to one MiB. Concurrent refreshes for one cache identity are coalesced, and tokens are refreshed at least one minute before expiration. Live GitHub proof remains part of the end-to-end pilot.
