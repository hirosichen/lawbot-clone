// Cloudflare Pages Function: /api/file/:id
// Retrieve parsed markdown content for a file

interface Env {
  PARSED: KVNamespace;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: CORS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const fileId = params.id as string;

  if (!fileId) {
    return Response.json({ error: 'File ID required' }, { status: 400, headers: CORS });
  }

  const { value, metadata } = await env.PARSED.getWithMetadata(
    `parsed:${fileId}`,
    { type: 'text' },
  );

  if (!value) {
    return Response.json({ error: 'File not found or expired' }, { status: 404, headers: CORS });
  }

  return Response.json({ fileId, content: value, metadata }, { headers: CORS });
};
