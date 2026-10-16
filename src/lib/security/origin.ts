export function isSameOriginRequest(request: Request, applicationUrl: string): boolean {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return false;
  }

  try {
    return new URL(requestOrigin).origin === new URL(applicationUrl).origin;
  } catch {
    return false;
  }
}
