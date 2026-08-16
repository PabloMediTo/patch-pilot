# Change Proposals

## Responsibility

Produce the first reviewable [change proposal](../DICTIONARY.md#change-proposal) stage from a reproduced issue: a bounded versioned implementation plan, a source diff with independently derived evidence, exact plan-to-diff traceability, and a canonical safety decision.

## Not responsible for

- selecting or calling a specific LLM provider
- applying a patch to the repository workspace
- executing verification commands or critiquing their evidence
- persisting the proposal or advancing durable workflow state
- creating a branch or pull request

## Inputs

- immutable bounded [issue context](../DICTIONARY.md#issue-context) persisted with the submitted run
- successful [failure reproduction](../DICTIONARY.md#failure-reproduction)
- inspected repository context and relevant files
- structured plan-generator and diff-generator ports

## Outputs

- a versioned structured implementation plan
- a git-style unified source diff
- changed-file and line-count evidence derived from the diff
- a ready or blocked status with the [MVP safety policy](../DICTIONARY.md#mvp-safety-policy) decision

## Adjacent parts

- repository understanding supplies inspected context
- failure reproduction gates planning
- safety owns forbidden-path and proposal-size policy
- modification will apply only ready diffs in an isolated repository workspace
- verification and critique add later review evidence
- persistence will store plan versions and proposal artifacts

## Plan contract

The plan generator receives immutable issue, reproduction, repository-context, and limit data. Issue title and descriptive context are now preserved by authenticated run submission; repository file context and concrete generator-provider composition remain later workflow work. The generator may return at most eight ordered steps. Every step requires a concrete description, rationale, and one or more repository-relative files. One file belongs to exactly one step so ownership remains unambiguous.

The plan is versioned from its first representation. Later modification or retry work must create a new version rather than silently changing the plan reviewed by a human.

## Diff contract

The diff generator receives the validated plan and returns a git-style unified diff. The proposal boundary parses file headers and hunks itself to derive changed paths and added/deleted line counts; generator-supplied metrics are not trusted.

Renames are outside the MVP. Every diff file must contain a changed hunk, remain repository-relative, and appear exactly once in the plan. A diff that omits a planned file or adds an unplanned file is rejected before it becomes a proposal.

## Safety outcome

The derived change evidence is assessed with the canonical immutable MVP policy. A policy violation creates a reviewable blocked proposal rather than throwing away the plan or diff evidence. Malformed generator output is rejected as an invalid boundary response.
