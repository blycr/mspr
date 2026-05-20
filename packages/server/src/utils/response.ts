export function jsonResponse(data: unknown): Response {
  return Response.json(data);
}

export function bufferResponse(buffer: ArrayBuffer, contentType: string, headers?: Record<string, string>): Response {
  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      ...headers,
    },
  });
}
