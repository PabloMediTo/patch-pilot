import { createMaintainerWebApplication } from "./application/index.js";
import { env } from "node:process";

import { createMaintainerWebServer } from "./web-server/index.js";

createMaintainerWebApplication();
const port = Number(env.PATCH_PILOT_WEB_PORT ?? "3000");
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PATCH_PILOT_WEB_PORT must be a valid TCP port.");
const server = createMaintainerWebServer({ apiOrigin: env.PATCH_PILOT_API_ORIGIN ?? "http://127.0.0.1:3001" });
server.listen(port, env.PATCH_PILOT_WEB_HOST ?? "127.0.0.1");
