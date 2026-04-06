// Cloudflare Pages Function: /api/chat
// RAG pipeline: keyword search + law articles → Gemma 4 26B generation

interface Env {
  AI: Ai;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const LAW_API = 'https://law-api.onlymake.ai';

// --- Helpers ---

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// --- RAG: Retrieve relevant context ---

interface SearchResult {
  jid: string;
  jtitle: string;
  jcourt: string;
  jdate: string;
  jfull?: string;
}

interface LawArticleResult {
  article_no: string;
  article_content: string;
}

// Keyword search for rulings (reliable, fast)
async function searchRulings(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `${LAW_API}/api/search?q=${encodeURIComponent(query)}&limit=3&mode=title`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json() as { results?: SearchResult[] };
    return (data.results || []).map(r => ({
      ...r,
      jfull: r.jfull ? cleanText(r.jfull.slice(0, 400)) : '',
    }));
  } catch {
    return [];
  }
}

// Search specific law articles
async function searchLawArticles(query: string): Promise<Array<{ law_name: string; pcode: string; articles: LawArticleResult[] }>> {
  const lawPcodeMap: Record<string, string> = {
    '民法': 'B0000001', '刑法': 'C0000001',
    '民事訴訟法': 'B0010001', '刑事訴訟法': 'C0010001',
    '憲法': 'A0000001', '公司法': 'J0080001',
    '勞動基準法': 'N0030001', '勞基法': 'N0030001',
    '消費者保護法': 'J0170001', '消保法': 'J0170001',
    '家事事件法': 'B0010048', '行政訴訟法': 'A0030154',
    '行政程序法': 'A0030055', '國家賠償法': 'I0020004',
    '著作權法': 'J0070017', '公寓大廈管理條例': 'D0070118',
    '洗錢防制法': 'G0380131', '貪污治罪條例': 'C0000007',
    '個人資料保護法': 'I0050021', '個資法': 'I0050021',
    '性別平等工作法': 'N0030014', '強制執行法': 'B0010004',
    '道路交通管理處罰條例': 'K0040012',
    '道路交通安全規則': 'K0040013',
  };

  const results: Array<{ law_name: string; pcode: string; articles: LawArticleResult[] }> = [];

  // Find mentioned laws
  const foundLaws: Array<{ name: string; pcode: string }> = [];
  for (const [name, pcode] of Object.entries(lawPcodeMap)) {
    if (query.includes(name)) {
      foundLaws.push({ name, pcode });
    }
  }

  // Extract article numbers: 第184條, 第 277 條, 第11-1條
  const articleMatches = [...query.matchAll(/第\s*(\d+(?:-\d+)?)\s*條/g)];
  const articleNos = articleMatches.map(m => m[1]);

  for (const law of foundLaws) {
    try {
      if (articleNos.length > 0) {
        // Fetch specific articles
        for (const no of articleNos) {
          const res = await fetch(
            `${LAW_API}/api/laws/${law.pcode}/articles?article_no=${no}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (!res.ok) continue;
          const data = await res.json() as { articles?: LawArticleResult[] };
          if (data.articles?.length) {
            const existing = results.find(r => r.pcode === law.pcode);
            if (existing) {
              existing.articles.push(...data.articles);
            } else {
              results.push({ law_name: law.name, pcode: law.pcode, articles: [...data.articles] });
            }
          }
        }
      } else {
        // Search articles by content
        const res = await fetch(
          `${LAW_API}/api/laws/${law.pcode}/articles?q=${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json() as { articles?: Array<LawArticleResult & { article_type: string }> };
        const articles = (data.articles || [])
          .filter(a => a.article_type === 'A')
          .slice(0, 3);
        if (articles.length) {
          results.push({ law_name: law.name, pcode: law.pcode, articles });
        }
      }
    } catch { /* skip */ }
  }

  // If no specific law mentioned but article numbers found, try 民法 as default
  if (foundLaws.length === 0 && articleNos.length > 0) {
    try {
      for (const no of articleNos) {
        const res = await fetch(
          `${LAW_API}/api/laws/B0000001/articles?article_no=${no}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json() as { articles?: LawArticleResult[] };
        if (data.articles?.length) {
          const existing = results.find(r => r.pcode === 'B0000001');
          if (existing) {
            existing.articles.push(...data.articles);
          } else {
            results.push({ law_name: '民法', pcode: 'B0000001', articles: [...data.articles] });
          }
        }
      }
    } catch { /* skip */ }
  }

  return results.slice(0, 5);
}

// --- Build context and references ---

function buildContext(
  rulings: SearchResult[],
  lawResults: Array<{ law_name: string; pcode: string; articles: LawArticleResult[] }>,
): string {
  const parts: string[] = [];

  if (lawResults.length > 0) {
    let lawIdx = 1;
    for (const law of lawResults) {
      for (const a of law.articles) {
        parts.push(`[法${lawIdx}] ${law.law_name} ${a.article_no}：\n${cleanText(a.article_content)}`);
        lawIdx++;
      }
    }
  }

  if (rulings.length > 0) {
    rulings.forEach((r, i) => {
      const snippet = r.jfull ? `\n摘要：${r.jfull.slice(0, 300)}` : '';
      parts.push(`[判${i + 1}] ${r.jtitle}（${r.jid}）${snippet}`);
    });
  }

  return parts.join('\n\n');
}

function buildReferences(
  rulings: SearchResult[],
  lawResults: Array<{ law_name: string; pcode: string; articles: LawArticleResult[] }>,
): Array<{ label: string; type: 'law' | 'ruling' }> {
  const refs: Array<{ label: string; type: 'law' | 'ruling' }> = [];

  for (const law of lawResults) {
    for (const a of law.articles) {
      refs.push({ label: `${law.law_name}${a.article_no}`, type: 'law' });
    }
  }
  for (const r of rulings) {
    refs.push({ label: r.jtitle || r.jid, type: 'ruling' });
  }

  return refs;
}

function generateFollowUps(
  query: string,
  lawResults: Array<{ law_name: string; articles: LawArticleResult[] }>,
  rulings: SearchResult[],
): string[] {
  const followUps: string[] = [];

  if (lawResults.length > 0) {
    followUps.push(`${lawResults[0].law_name}還有哪些相關條文？`);
  }
  if (rulings.length > 0) {
    followUps.push('實務上法院通常如何判決這類案件？');
  }

  // Topic-specific suggestions
  if (query.includes('賠償') || query.includes('損害')) {
    followUps.push('損害賠償的舉證責任如何分配？');
  } else if (query.includes('契約') || query.includes('合約')) {
    followUps.push('如果對方違約，可以請求什麼救濟？');
  } else if (query.includes('勞工') || query.includes('解僱') || query.includes('資遣')) {
    followUps.push('被違法解僱可以申請哪些救濟管道？');
  } else if (query.includes('車禍') || query.includes('交通')) {
    followUps.push('車禍肇事責任的過失比例如何認定？');
  } else if (query.includes('租') || query.includes('房東') || query.includes('房客')) {
    followUps.push('租賃契約的押金返還規定為何？');
  } else {
    followUps.push('這個問題在實務上有哪些常見爭議？');
  }

  if (followUps.length < 3) {
    followUps.push('可以幫我整理相關的法律條文嗎？');
  }

  return followUps.slice(0, 3);
}

// --- Main handler ---

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json() as ChatRequest;
    const { message, conversationHistory = [] } = body;

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400, headers: corsHeaders });
    }

    // Step 1: Parallel retrieval (keyword search + law articles)
    const [rulings, lawResults] = await Promise.all([
      searchRulings(message),
      searchLawArticles(message),
    ]);

    const contextText = buildContext(rulings, lawResults);
    const references = buildReferences(rulings, lawResults);

    // Step 2: Build messages for Gemma 4
    const systemContent = `你是一位專業的台灣法律 AI 助手。請根據提供的法學資料，以結構化方式回答法律問題。

規則：
- 使用繁體中文回答
- 引用法條時標記 [法N]，引用判決時標記 [判N]
- 使用 **粗體** 標示重要概念
- 先說明法律依據，再分析實務見解，最後給具體建議
- 如果資料不足，誠實說明並建議諮詢律師
- 不要編造法條或判決
${contextText ? `\n以下是相關法學資料：\n${contextText}` : '\n目前沒有檢索到相關資料，請根據法律知識回答。'}`;

    const aiMessages = [
      { role: 'system' as const, content: systemContent },
      ...conversationHistory.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Step 3: Call Gemma 4 26B
    let fullText: string;
    try {
      // @ts-expect-error - model ID valid but not in TS types
      const aiResponse = await env.AI.run('@cf/google/gemma-4-26b-a4b-it', {
        messages: aiMessages,
        max_tokens: 2048,
        temperature: 0.7,
      });

      // Extract response from various possible formats
      const r = aiResponse as Record<string, unknown>;
      if (typeof r?.response === 'string' && r.response) {
        fullText = r.response;
      } else if (Array.isArray(r?.choices)) {
        const choices = r.choices as Array<{ message?: { content?: string } }>;
        fullText = choices[0]?.message?.content || '';
      } else if (typeof r?.result === 'string') {
        fullText = r.result;
      } else {
        fullText = '';
      }

      // Remove <think>...</think> blocks if present (some models include reasoning)
      fullText = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      if (!fullText) {
        throw new Error('Empty AI response');
      }
    } catch (aiErr) {
      console.error('AI error:', aiErr);
      if (contextText) {
        fullText = `**以下是為您檢索到的相關法學資料：**\n\n${contextText}\n\n> AI 分析功能暫時無法使用，以上為原始搜尋結果。`;
      } else {
        fullText = '抱歉，目前無法為您分析此問題。請嘗試更具體的問題描述，或使用精準搜尋功能查找判決和法條。';
      }
    }

    // Step 4: Stream response to client via SSE
    const encoder = new TextEncoder();
    const followUps = generateFollowUps(message, lawResults, rulings);

    const stream = new ReadableStream({
      async start(controller) {
        // Send references
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'references', references })}\n\n`)
        );

        // Stream text in chunks (typing effect)
        const chunkSize = 4;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'token', token: fullText.slice(i, i + chunkSize) })}\n\n`)
          );
        }

        // Send follow-ups
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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
