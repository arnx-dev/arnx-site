interface Env {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  PILOT_TO?: string;
  ALLOWED_ORIGINS?: string;
  PILOT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}
export async function handleRequest(
  request: Request,
  env: Env,
  send: typeof fetch = fetch,
): Promise<Response> {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  const reply = (status: number, message: string, ok = false) =>
    new Response(JSON.stringify({ ok, message }), { status, headers });
  if (!origin || !allowed.includes(origin))
    return reply(403, "Origin not allowed");
  headers["Access-Control-Allow-Origin"] = origin;
  if (new URL(request.url).pathname !== "/pilot")
    return reply(404, "Not found");
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
      },
    });
  if (request.method !== "POST") return reply(405, "Method not allowed");
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return reply(415, "Expected JSON");
  if (
    !env.RESEND_API_KEY ||
    !env.RESEND_FROM ||
    !env.PILOT_TO ||
    !env.PILOT_RATE_LIMITER
  )
    return reply(503, "Requests are temporarily unavailable");
  try {
    const limiter = await env.PILOT_RATE_LIMITER.limit({
      key: `pilot:${request.headers.get("CF-Connecting-IP") || "unknown"}`,
    });
    if (!limiter.success) return reply(429, "Please wait before trying again");
    const reader = request.body?.getReader();
    if (!reader) return reply(400, "Missing body");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return reply(413, "Request too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let data;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return reply(400, "Invalid JSON");
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      return reply(400, "Invalid request");
    if (data.website) return reply(400, "Invalid request");
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const project = typeof data.project === "string" ? data.project.trim() : "";
    if (
      email.length > 254 ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
      /[\r\n]/.test(email)
    )
      return reply(400, "Enter a valid email address");
    if (
      (data.project !== undefined && typeof data.project !== "string") ||
      project.length > 1000
    )
      return reply(400, "Project note too long or invalid");
    if (
      typeof data.submissionId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(data.submissionId)
    )
      return reply(400, "Invalid submission ID");
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `pilot/${data.submissionId}`,
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [env.PILOT_TO],
        reply_to: email,
        subject: "arnx pilot request",
        text: `Email: ${email}\n\nProject:\n${project || "(not supplied)"}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return reply(502, "Could not send the request");
    const result = (await response.json()) as { id?: string };
    if (!result.id) return reply(502, "Could not confirm the request");
    return reply(200, "Request sent", true);
  } catch {
    return reply(502, "Could not send the request");
  }
}
export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
