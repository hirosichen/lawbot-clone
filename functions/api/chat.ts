// Cloudflare Pages Function: /api/chat
// RAG pipeline: semantic search + law search → Qwen3-30B generation

interface Env {
  AI: Ai;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface SearchResult {
  jid: string;
  jtitle: string;
  jcourt: string;
  jdate: string;
  chunk_text?: string;
  section?: string;
  score?: number;
}

interface LawResult {
  pcode: string;
  law_name: string;
  article_no: string;
  article_content: string;
}

const LAW_API = 'https://law-api.onlymake.ai';

// --- RAG: Retrieve relevant context ---

async function searchRulings(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${LAW_API}/api/semantic-search?q=${encodeURIComponent(query)}&limit=5&probes=3`
    );
    if (!res.ok) return [];
    const data = await res.json() as { results: SearchResult[] };
    return data.results || [];
  } catch {
    return [];
  }
}

async function searchLaws(query: string): Promise<LawResult[]> {
  // Extract law names from query
  const lawKeywords = [
    '民法', '刑法', '民事訴訟法', '刑事訴訟法', '憲法',
    '公司法', '勞動基準法', '勞基法', '消費者保護法', '消保法',
    '家事事件法', '行政訴訟法', '行政程序法', '國家賠償法',
    '道路交通管理處罰條例', '著作權法', '商標法', '專利法',
    '公寓大廈管理條例', '洗錢防制法', '貪污治罪條例',
    '個人資料保護法', '個資法', '性別平等工作法',
    '強制執行法', '破產法', '土地法', '稅捐稽徵法',
  ];

  // Also extract article numbers like "第184條", "第277條"
  const articleMatch = query.match(/第\s*(\d+(?:-\d+)?)\s*條/);
  const foundLaws = lawKeywords.filter(k => query.includes(k));

  if (foundLaws.length === 0 && !articleMatch) return [];

  const results: LawResult[] = [];

  // Map common law names to pcodes
  const lawPcodeMap: Record<string, string> = {
    '民法': 'B0000001', '刑法': 'C0000001',
    '民事訴訟法': 'B0010001', '刑事訴訟法': 'C0010001',
    '憲法': 'A0000001', '公司法': 'J0080001',
    '勞動基準法': 'N0030001', '勞基法': 'N0030001',
    '消費者保護法': 'J0170001', '消保法': 'J0170001',
    '家事事件法': 'B0010048', '行政訴訟法': 'A0030154',
    '行政程序法': 'A0030055', '國家賠償法': 'I0020004',
    '著作權法': 'J0070017', '商標法': 'J0070001',
    '專利法': 'J0070007', '公寓大廈管理條例': 'D0070118',
    '洗錢防制法': 'G0380131', '貪污治罪條例': 'C0000007',
    '個人資料保護法': 'I0050021', '個資法': 'I0050021',
    '性別平等工作法': 'N0030014', '強制執行法': 'B0010004',
    '道路交通管理處罰條例': 'K0040012',
  };

  for (const lawName of foundLaws) {
    const pcode = lawPcodeMap[lawName];
    if (!pcode) continue;

    try {
      if (articleMatch) {
        const articleNo = articleMatch[1];
        const res = await fetch(
          `${LAW_API}/api/laws/${pcode}/articles?article_no=${articleNo}`
        );
        if (res.ok) {
          const data = await res.json() as { articles: Array<{ article_no: string; article_content: string }> };
          for (const a of (data.articles || [])) {
            results.push({
              pcode,
              law_name: lawName,
              article_no: a.article_no,
              article_content: a.article_content,
            });
          }
        }
      } else {
        // Get first few articles as context
        const res = await fetch(`${LAW_API}/api/laws/${pcode}/articles?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json() as { articles: Array<{ article_type: string; article_no: string; article_content: string }> };
          const articles = (data.articles || [])
            .filter((a: { article_type: string }) => a.article_type === 'A')
            .slice(0, 3);
          for (const a of articles) {
            results.push({
              pcode,
              law_name: lawName,
              article_no: a.article_no,
              article_content: a.article_content,
            });
          }
        }
      }
    } catch {
      // skip
    }
  }

  return results.slice(0, 5);
}

async function keywordSearch(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${LAW_API}/api/search?q=${encodeURIComponent(query)}&limit=3`
    );
    if (!res.ok) return [];
    const data = await res.json() as { results: SearchResult[] };
    return data.results || [];
  } catch {
    return [];
  }
}

// --- Build prompt with retrieved context ---

function buildPrompt(
  query: string,
  rulings: SearchResult[],
  laws: LawResult[],
  keywordResults: SearchResult[],
): string {
  let context = '';

  if (laws.length > 0) {
    context += '【相關法條】\n';
    laws.forEach((l, i) => {
      context += `[法${i + 1}] ${l.law_name} ${l.article_no}：${l.article_content}\n\n`;
    });
  }

  if (rulings.length > 0) {
    context += '【相關判決（語意搜尋）】\n';
    rulings.forEach((r, i) => {
      const score = r.score ? `（相似度 ${(r.score * 100).toFixed(0)}%）` : '';
      context += `[判${i + 1}] ${r.jtitle} ${score}\n`;
      context += `案號：${r.jid}\n`;
      if (r.section) context += `段落：${r.section}\n`;
      if (r.chunk_text) context += `內容：${r.chunk_text.slice(0, 300)}\n`;
      context += '\n';
    });
  }

  if (keywordResults.length > 0) {
    context += '【相關判決（關鍵字搜尋）】\n';
    keywordResults.forEach((r, i) => {
      context += `[搜${i + 1}] ${r.jtitle}（${r.jid}）\n`;
    });
    context += '\n';
  }

  return context;
}

function buildReferences(
  rulings: SearchResult[],
  laws: LawResult[],
): Array<{ label: string; type: 'law' | 'ruling' }> {
  const refs: Array<{ label: string; type: 'law' | 'ruling' }> = [];

  for (const l of laws) {
    refs.push({ label: `${l.law_name}${l.article_no}`, type: 'law' });
  }
  for (const r of rulings) {
    refs.push({ label: r.jtitle || r.jid, type: 'ruling' });
  }

  return refs;
}

// --- Main handler ---

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json() as ChatRequest;
    const { message, conversationHistory = [] } = body;

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400, headers: corsHeaders });
    }

    // Step 1: Parallel retrieval
    const [rulings, laws, keywordResults] = await Promise.all([
      searchRulings(message),
      searchLaws(message),
      keywordSearch(message),
    ]);

    const context_text = buildPrompt(message, rulings, laws, keywordResults);
    const references = buildReferences(rulings, laws);

    // Step 2: Build messages for LLM
    const systemPrompt = `你是一位台灣法律 AI 助手，專精於台灣法律分析與研究。請根據提供的法學資料，以專業、結構化的方式回答使用者的法律問題。

回答規則：
1. 使用繁體中文回答
2. 引用具體法條時使用 [法N] 標記，引用判決時使用 [判N] 標記
3. 回答要有結構：使用 **粗體** 標示重要概念，用編號列表組織論點
4. 先說明法律依據，再分析實務見解，最後給出具體建議
5. 如果提供的資料不足以完整回答，請誠實說明並建議使用者諮詢律師
6. 不要編造不存在的法條或判決

${context_text ? `以下是檢索到的相關法學資料，請根據這些資料回答：\n\n${context_text}` : '目前沒有檢索到直接相關的法學資料，請根據你的法律知識回答，並提醒使用者查閱具體法條。'}`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 6 turns)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: message });

    // Step 3: Get response from Qwen3 (non-streaming for reliability, then stream to client)
    const aiResponse = await env.AI.run(
      '@cf/qwen/qwen3-30b-a3b-fp8' as BaseAiTextGenerationModels,
      {
        messages: messages as RoleScopedChatInput[],
        max_tokens: 2048,
        temperature: 0.7,
      }
    ) as { response?: string };

    const fullText = aiResponse?.response || '抱歉，目前無法生成回覆。請稍後再試。';

    // Build SSE stream: references → tokens (chunked for typing effect) → followups
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send references first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'references', references })}\n\n`)
        );

        // Stream text in small chunks for typing effect
        const chunkSize = 3; // characters per chunk
        for (let i = 0; i < fullText.length; i += chunkSize) {
          const token = fullText.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
          );
        }

        // Send follow-up questions
        const followUps = generateFollowUps(message, laws, rulings);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'followups', questions: followUps })}\n\n`)
        );

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

function generateFollowUps(
  query: string,
  laws: LawResult[],
  rulings: SearchResult[],
): string[] {
  const followUps: string[] = [];

  if (laws.length > 0) {
    const lawName = laws[0].law_name;
    followUps.push(`${lawName}還有哪些相關條文？`);
  }

  if (rulings.length > 0) {
    followUps.push('實務上法院通常如何判決這類案件？');
  }

  if (query.includes('賠償') || query.includes('損害')) {
    followUps.push('損害賠償的舉證責任如何分配？');
  } else if (query.includes('契約') || query.includes('合約')) {
    followUps.push('如果對方違約，可以請求什麼救濟？');
  } else if (query.includes('勞工') || query.includes('解僱') || query.includes('資遣')) {
    followUps.push('被違法解僱可以申請哪些救濟管道？');
  } else {
    followUps.push('這個問題在實務上有哪些常見爭議？');
  }

  if (followUps.length < 3) {
    followUps.push('可以幫我整理相關的法律條文嗎？');
  }

  return followUps.slice(0, 3);
}
