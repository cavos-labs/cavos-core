import { NextResponse } from "next/server";

const CAVOS_TOKEN = process.env.CAVOS_TOKEN;

type MiddlewareResult =
  | { valid: true }
  | { valid: false; response: NextResponse };

export function validateRequest(req: Request): MiddlewareResult {
  const origin = req.headers.get("origin") || "*";

  if (req.method === "OPTIONS") {
    return {
      valid: false,
      response: NextResponse.json(
        { message: "CORS preflight OK" },
        {
          status: 200,
          headers: corsHeaders(origin),
        }
      ),
    };
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      response: NextResponse.json(
        { message: "Unauthorized: Missing or invalid Bearer token" },
        {
          status: 401,
          headers: corsHeaders(origin),
        }
      ),
    };
  }

  const token = authHeader.split(" ")[1];
  if (token !== CAVOS_TOKEN) {
    return {
      valid: false,
      response: NextResponse.json(
        { message: "Unauthorized: Invalid Bearer token" },
        {
          status: 401,
          headers: corsHeaders(origin),
        }
      ),
    };
  }

  return { valid: true };
}

export function withCORS(response: NextResponse, origin = "*"): NextResponse {
  const headers = corsHeaders(origin);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
