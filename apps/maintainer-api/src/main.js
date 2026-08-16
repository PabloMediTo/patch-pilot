import process from "node:process";

import { createMaintainerApiApplication, createMaintainerApiDeployment } from "./application/index.js";

createMaintainerApiApplication();
const deployment = await createMaintainerApiDeployment({ environment: process.env });
await deployment.listen();
installShutdownHandlers(deployment);

/** Closes HTTP, Redis, and Postgres exactly once on an operating-system stop signal. */
function installShutdownHandlers(target) {
  let shutdownPromise;
  const shutdown = () => {
    shutdownPromise ??= target.close().catch((error) => {
      process.stderr.write(`${error?.stack ?? error}\n`);
      process.exitCode = 1;
    });
    return shutdownPromise;
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
