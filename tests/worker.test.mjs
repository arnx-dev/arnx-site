import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../worker/index.ts";
const env = {
  RESEND_API_KEY: "test-secret",
  RESEND_FROM: "arnx <pilot@example.com>",
  PILOT_TO: "info@arnx.dev",
  ALLOWED_ORIGINS: "https://arnx.dev",
  PILOT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const valid = {
  email: "dev@example.com",
  project: "Python project",
  website: "",
  submissionId: "12345678-1234-1234-1234-123456789abc",
};
function request(data = valid, origin = "https://arnx.dev") {
  return new Request("https://forms.example.com/pilot", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
const never = () => {
  throw Error("Provider must not be called");
};
test("sends only to owner, sets reply-to and stable idempotency header", async () => {
  let calls = 0;
  const response = await handleRequest(request(), env, async (url, options) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    assert.deepEqual(body.to, ["info@arnx.dev"]);
    assert.equal(body.reply_to, valid.email);
    assert.equal(
      options.headers["Idempotency-Key"],
      `pilot/${valid.submissionId}`,
    );
    assert.match(body.text, /Python project/);
    return Response.json({ id: "email-1" });
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(calls, 1);
});
test("rejects disallowed origin and missing configuration without sending", async () => {
  assert.equal(
    (await handleRequest(request(valid, "https://bad.example"), env, never))
      .status,
    403,
  );
  assert.equal(
    (await handleRequest(request(), { ...env, RESEND_API_KEY: "" }, never))
      .status,
    503,
  );
});
test("preflight has explicit origin, method and headers", async () => {
  const response = await handleRequest(
    new Request("https://forms.example.com/pilot", {
      method: "OPTIONS",
      headers: { Origin: "https://arnx.dev" },
    }),
    env,
    never,
  );
  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://arnx.dev",
  );
});
test("rejects invalid email, honeypot, oversized notes and invalid shape", async () => {
  for (const data of [
    { ...valid, email: "bad" },
    { ...valid, email: "x@example.com\nBcc:bad@example.com" },
    { ...valid, website: "bot" },
    { ...valid, project: "x".repeat(1001) },
    { ...valid, submissionId: "bad" },
    null,
    [],
  ])
    assert.equal((await handleRequest(request(data), env, never)).status, 400);
});
test("rejects oversized body before JSON parsing", async () => {
  assert.equal(
    (
      await handleRequest(
        request({ ...valid, project: "x".repeat(9000) }),
        env,
        never,
      )
    ).status,
    413,
  );
});
test("rate limit prevents provider calls", async () => {
  assert.equal(
    (
      await handleRequest(
        request(),
        {
          ...env,
          PILOT_RATE_LIMITER: { limit: async () => ({ success: false }) },
        },
        never,
      )
    ).status,
    429,
  );
});
test("provider errors, malformed success and transport failures never report success", async () => {
  for (const send of [
    async () => Response.json({ message: "bad" }, { status: 403 }),
    async () => Response.json({}),
    async () => {
      throw new Error("network");
    },
  ]) {
    const result = await handleRequest(request(), env, send);
    assert.equal(result.status, 502);
    assert.equal((await result.json()).ok, false);
  }
});
