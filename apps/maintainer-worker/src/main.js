import process from "node:process";

import { createMaintainerWorkerApplication,
  createMaintainerWorkerDeployment } from "./application/index.js";

createMaintainerWorkerApplication();
const deployment = await createMaintainerWorkerDeployment({ environment: process.env });
try {
  await deployment.run();
} finally {
  await deployment.close();
}
