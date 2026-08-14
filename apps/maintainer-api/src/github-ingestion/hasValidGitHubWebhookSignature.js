import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Checks the SHA-256 signature of an unmodified GitHub webhook body.
 *
 * @param {{ rawBody: string, secret: string, signature: string }} input Signature material.
 * @returns {boolean} Whether the supplied signature matches the body.
 */
export function hasValidGitHubWebhookSignature({ rawBody, secret, signature }) {
  const expectedSignature = `sha256=${createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature ?? "", "utf8");

  const hasEqualLength = expectedBuffer.length === receivedBuffer.length;
  return hasEqualLength && timingSafeEqual(expectedBuffer, receivedBuffer);
}
