import { createApiErrorResponse } from "@/lib/apiErrorHandler";
import { getApiBaseUrl } from "@/app/lib/config";

export async function POST(request: Request) {
  const correlationId = request.headers.get("X-Correlation-ID") || "unknown";

  try {
    const body = await request.json();
    const baseApiUrl = getApiBaseUrl();
    const requestUrl = new URL(request.url);
    const backendApiUrl = new URL(baseApiUrl);

    if (backendApiUrl.host === requestUrl.host) {
      return createApiErrorResponse(
        {
          message:
            "Server misconfiguration: BACKEND_API_URL points to the frontend instead of the Render backend.",
          code: "BACKEND_API_URL_SELF_REFERENCE",
        },
        {
          status: 503,
          correlationId,
          route: "POST /api/users/register",
        },
      );
    }

    const backendUrl = `${baseApiUrl}/users/register`;

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.clone().json().catch(async () => ({
        message: await response.text().catch(() => response.statusText),
      }));
      return createApiErrorResponse(errData, {
        status: response.status,
        upstreamResponse: response,
        correlationId,
        route: "POST /api/users/register",
      });
    }

    const responseBody = await response.text();
    return new Response(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return createApiErrorResponse(error, {
      status:
        error instanceof Error && error.message.includes("BACKEND_API_URL")
          ? 503
          : 500,
      correlationId,
      route: "POST /api/users/register",
    });
  }
}

export async function GET() {
  return createApiErrorResponse(
    {
      message: "Method GET is not allowed for registration. Use POST.",
      code: "METHOD_NOT_ALLOWED",
    },
    { status: 405, route: "GET /api/users/register" },
  );
}
