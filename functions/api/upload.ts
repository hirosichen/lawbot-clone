// Cloudflare Pages Function: /api/upload
// Upload file → R2 storage → toMarkdown() → KV parsed cache

interface Env {
  AI: Ai;
  FILES: R2Bucket;
  PARSED: KVNamespace;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/html',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: CORS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400, headers: CORS });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400, headers: CORS },
      );
    }

    // Validate type
    if (!ALLOWED_TYPES.has(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      return Response.json(
        { error: `Unsupported file type: ${file.type}. Supported: PDF, DOCX, PPTX, XLSX, HTML, TXT, CSV, images` },
        { status: 400, headers: CORS },
      );
    }

    // Generate file ID
    const fileId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = file.name.split('.').pop() || 'bin';
    const r2Key = `files/${fileId}.${ext}`;

    // Step 1: Store original file in R2
    const fileBuffer = await file.arrayBuffer();
    await env.FILES.put(r2Key, fileBuffer, {
      customMetadata: {
        originalName: file.name,
        contentType: file.type,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Step 2: Parse to Markdown using Cloudflare AI
    let markdown = '';
    let parseMethod = 'toMarkdown';

    try {
      const blob = new Blob([fileBuffer], { type: file.type });
      // @ts-expect-error - toMarkdown is available on AI binding
      const results = await env.AI.toMarkdown([{ name: file.name, blob }]);
      markdown = results?.[0]?.data || '';
    } catch (parseErr) {
      console.error('toMarkdown failed:', parseErr);
      parseMethod = 'fallback';

      // Fallback: for text files, just read as text
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        const decoder = new TextDecoder();
        markdown = decoder.decode(fileBuffer);
      } else {
        markdown = `[Unable to parse file: ${file.name}]`;
      }
    }

    // Truncate if too long (keep first ~20K chars for KV storage + LLM context)
    const MAX_PARSED_LENGTH = 20000;
    const truncated = markdown.length > MAX_PARSED_LENGTH;
    const storedMarkdown = truncated ? markdown.slice(0, MAX_PARSED_LENGTH) + '\n\n...(文件內容已截斷)' : markdown;

    // Step 3: Store parsed result in KV (TTL: 7 days)
    await env.PARSED.put(`parsed:${fileId}`, storedMarkdown, {
      expirationTtl: 7 * 24 * 60 * 60, // 7 days
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        parseMethod,
        charCount: markdown.length,
        truncated,
      },
    });

    // Return file info + preview
    const preview = storedMarkdown.slice(0, 200) + (storedMarkdown.length > 200 ? '...' : '');

    return Response.json(
      {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        charCount: storedMarkdown.length,
        truncated,
        preview,
        parseMethod,
      },
      { headers: CORS },
    );
  } catch (err) {
    console.error('Upload error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500, headers: CORS },
    );
  }
};
