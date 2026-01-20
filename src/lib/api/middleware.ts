import { NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "./rate-limit";

/**
 * API middleware for rate limiting.
 * Use this in API routes to add rate limiting.
 */
export function withRateLimit(handler: (request: Request, context?: any) => Promise<Response>) {
  return async (request: Request, context?: any) => {
    const identifier = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult || !rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimitResult
                ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
                : 60
            ),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": String(rateLimitResult?.remaining || 0),
            "X-RateLimit-Reset": String(rateLimitResult?.resetTime || Date.now() + 60000),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request, context);
    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Limit", "100");
    headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
    headers.set("X-RateLimit-Reset", String(rateLimitResult.resetTime));

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
