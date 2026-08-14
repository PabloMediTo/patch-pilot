# Supported Project Detection

## Responsibility

Determine whether one repository root is a [supported project](../DICTIONARY.md#supported-project) for the Python/TypeScript MVP and select its standard test command.

## Not responsible for

- installing dependencies
- executing tests
- choosing among multiple supported projects in one repository
- inferring custom commands from arbitrary issue prose

## Inputs

- a verified repository workspace root
- root-level project manifests and recognizable test configuration

## Outputs

- a supported TypeScript descriptor with `npm test`
- a supported Python descriptor with `python -m pytest`
- an explicit unsupported result for absent or ambiguous evidence

## Adjacent parts

- repository workspaces provide the immutable files
- failure reproduction executes the selected command through a bounded executor
- future MVP safety policy supplies the concrete executor

## Detection rules

A TypeScript project requires `package.json`, a non-empty `scripts.test`, and either `tsconfig.json` or a declared `typescript` dependency.

A Python project requires `pyproject.toml` or `requirements.txt` plus recognizable pytest evidence: `pytest.ini`, root `conftest.py`, `[tool.pytest.ini_options]`, or a pytest requirement.

If both shapes match, the repository is reported as ambiguous instead of guessing a project root. Monorepo package discovery and custom test-command inference are outside the MVP detector.
