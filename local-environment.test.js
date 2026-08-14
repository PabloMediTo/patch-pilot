import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "js-yaml";

const composeSource = await readFile(
  new URL("./compose.yaml", import.meta.url),
  "utf8",
);
const compose = load(composeSource);

test("local services use pinned images", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(compose.services).map(([name, service]) => [
        name,
        service.image,
      ]),
    ),
    {
      postgres: "postgres:16.14-alpine",
      redis: "redis:8.8.1-alpine",
      temporal: "temporalio/auto-setup:1.31.0",
      "temporal-ui": "temporalio/ui:2.49.1",
    },
  );
});

test("required backend services expose health checks", () => {
  assert.deepEqual(compose.services.postgres.healthcheck.test, [
    "CMD-SHELL",
    "pg_isready -U patch_pilot -d patch_pilot",
  ]);
  assert.deepEqual(compose.services.redis.healthcheck.test, [
    "CMD",
    "redis-cli",
    "ping",
  ]);
  assert.deepEqual(compose.services.temporal.healthcheck.test, [
    "CMD",
    "nc",
    "-z",
    "localhost",
    "7233",
  ]);
});

test("service readiness controls startup order", () => {
  assert.equal(
    compose.services.temporal.depends_on.postgres.condition,
    "service_healthy",
  );
  assert.equal(
    compose.services["temporal-ui"].depends_on.temporal.condition,
    "service_healthy",
  );
});
