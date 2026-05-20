export function notFound(message: string): Response {
  return new Response(message, { status: 404 });
}

export function forbidden(message: string = 'Forbidden'): Response {
  return new Response(message, { status: 403 });
}

export function serverError(message: string = 'Internal Server Error'): Response {
  return new Response(message, { status: 500 });
}

export function badRequest(message: string): Response {
  return new Response(message, { status: 400 });
}
