// Cloudflare Pages Function: /api/chat
// RAG: semantic search (top 5 rulings) + law articles → Qwen3-30B-A3B

interface Env {
  AI: Ai;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const LAW_API = 'https://law-api.onlymake.ai';

// --- Types ---

interface SemanticResult {
  jid: string;
  jtitle: string;
  jcourt: string;
  jdate: string;
  jyear: string;
  jcase: string;
  jno: string;
  chunk_text: string;
  section: string;
  score: number;
}

interface LawArticle {
  article_no: string;
  article_no_normalized: string;
  article_content: string;
}

interface Reference {
  label: string;
  type: 'law' | 'ruling';
  link: string; // frontend route: /ruling/xxx or /law/xxx
}

// --- Extract law references from ruling text ---

interface ExtractedLawRef {
  lawName: string;
  pcode: string;
  articleNo: string; // normalized, e.g. "184"
}

const LAW_NAME_TO_PCODE: Record<string, string> = {
  '民法': 'B0000001', '刑法': 'C0000001',
  '民事訴訟法': 'B0010001', '刑事訴訟法': 'C0010001',
  '憲法': 'A0000001', '公司法': 'J0080001',
  '勞動基準法': 'N0030001', '勞基法': 'N0030001',
  '消費者保護法': 'J0170001', '消保法': 'J0170001',
  '家事事件法': 'B0010048', '國家賠償法': 'I0020004',
  '著作權法': 'J0070017', '公寓大廈管理條例': 'D0070118',
  '洗錢防制法': 'G0380131', '貪污治罪條例': 'C0000007',
  '道路交通管理處罰條例': 'K0040012',
  '個人資料保護法': 'I0050021', '個資法': 'I0050021',
  '性別平等工作法': 'N0030014', '強制執行法': 'B0010004',
  '行政訴訟法': 'A0030154', '行政程序法': 'A0030055',
  '稅捐稽徵法': 'G0340001', '土地法': 'D0060001',
  '保險法': 'G0390001', '票據法': 'G0380001',
  '證券交易法': 'G0400001', '銀行法': 'G0380001',
  '破產法': 'B0010007', '商標法': 'J0070001',
  '專利法': 'J0070007', '社會秩序維護法': 'D0080067',
  '道路交通安全規則': 'K0040013',
  '強制汽車責任保險法': 'K0040019',
};

function extractLawRefsFromText(text: string): ExtractedLawRef[] {
  const refs: ExtractedLawRef[] = [];
  const seen = new Set<string>();

  // Pattern: 民法第184條, 刑法第 277 條, 勞動基準法第11條
  const lawNames = Object.keys(LAW_NAME_TO_PCODE).sort((a, b) => b.length - a.length); // longer first
  for (const lawName of lawNames) {
    const escaped = lawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped + '第\\s*(\\d+(?:-\\d+)?)\\s*條', 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const key = `${lawName}-${match[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({
        lawName,
        pcode: LAW_NAME_TO_PCODE[lawName],
        articleNo: match[1],
      });
    }
  }

  return refs.slice(0, 10); // max 10 unique law references
}

async function fetchLawArticles(refs: ExtractedLawRef[]): Promise<Array<{ lawName: string; pcode: string; articles: LawArticle[] }>> {
  const results: Array<{ lawName: string; pcode: string; articles: LawArticle[] }> = [];

  // Group by pcode to minimize requests
  const byPcode = new Map<string, { lawName: string; articleNos: string[] }>();
  for (const ref of refs) {
    const existing = byPcode.get(ref.pcode);
    if (existing) {
      if (!existing.articleNos.includes(ref.articleNo)) {
        existing.articleNos.push(ref.articleNo);
      }
    } else {
      byPcode.set(ref.pcode, { lawName: ref.lawName, articleNos: [ref.articleNo] });
    }
  }

  // Fetch articles in parallel
  const fetches = Array.from(byPcode.entries()).map(async ([pcode, { lawName, articleNos }]) => {
    const articles: LawArticle[] = [];
    for (const no of articleNos.slice(0, 5)) {
      try {
        const res = await fetch(
          `${LAW_API}/api/laws/${pcode}/articles?article_no=${no}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json() as { articles?: LawArticle[] };
        if (data.articles?.length) articles.push(...data.articles);
      } catch { /* skip */ }
    }
    if (articles.length > 0) {
      results.push({ lawName, pcode, articles });
    }
  });

  await Promise.all(fetches);
  return results;
}

// --- RAG Retrieval ---

async function semanticSearch(query: string): Promise<SemanticResult[]> {
  try {
    const url = `${LAW_API}/api/semantic-search?q=${encodeURIComponent(query)}&limit=5&probes=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    const data = await res.json() as { results?: SemanticResult[] };
    // Deduplicate by jid (same ruling may appear multiple times with different chunks)
    const seen = new Set<string>();
    return (data.results || []).filter(r => {
      if (seen.has(r.jid)) return false;
      seen.add(r.jid);
      return true;
    });
  } catch {
    return [];
  }
}

async function searchLawArticles(query: string): Promise<Array<{ lawName: string; pcode: string; articles: LawArticle[] }>> {
  const lawMap: Record<string, string> = {
    '民法': 'B0000001', '刑法': 'C0000001',
    '民事訴訟法': 'B0010001', '刑事訴訟法': 'C0010001',
    '憲法': 'A0000001', '公司法': 'J0080001',
    '勞動基準法': 'N0030001', '勞基法': 'N0030001',
    '消費者保護法': 'J0170001', '消保法': 'J0170001',
    '家事事件法': 'B0010048', '國家賠償法': 'I0020004',
    '著作權法': 'J0070017', '公寓大廈管理條例': 'D0070118',
    '洗錢防制法': 'G0380131', '貪污治罪條例': 'C0000007',
    '道路交通管理處罰條例': 'K0040012',
    '個人資料保護法': 'I0050021', '個資法': 'I0050021',
    '性別平等工作法': 'N0030014', '強制執行法': 'B0010004',
  };

  const results: Array<{ lawName: string; pcode: string; articles: LawArticle[] }> = [];

  // Find mentioned laws
  const mentionedLaws: Array<{ name: string; pcode: string }> = [];
  for (const [name, pcode] of Object.entries(lawMap)) {
    if (query.includes(name)) {
      // Avoid duplicates (e.g., 勞基法 and 勞動基準法)
      if (!mentionedLaws.some(l => l.pcode === pcode)) {
        mentionedLaws.push({ name, pcode });
      }
    }
  }

  // Extract article numbers: 第184條, 第 277 條, 第11-1條
  const articleMatches = [...query.matchAll(/第\s*(\d+(?:-\d+)?)\s*條/g)];
  const articleNos = articleMatches.map(m => m[1]);

  for (const law of mentionedLaws) {
    try {
      if (articleNos.length > 0) {
        for (const no of articleNos) {
          const res = await fetch(
            `${LAW_API}/api/laws/${law.pcode}/articles?article_no=${no}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (!res.ok) continue;
          const data = await res.json() as { articles?: LawArticle[] };
          if (data.articles?.length) {
            const existing = results.find(r => r.pcode === law.pcode);
            if (existing) {
              existing.articles.push(...data.articles);
            } else {
              results.push({ lawName: law.name, pcode: law.pcode, articles: [...data.articles] });
            }
          }
        }
      } else {
        // Search articles by keyword
        const res = await fetch(
          `${LAW_API}/api/laws/${law.pcode}/articles?q=${encodeURIComponent(query)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json() as { articles?: Array<LawArticle & { article_type: string }> };
        const articles = (data.articles || []).filter(a => a.article_type === 'A').slice(0, 3);
        if (articles.length) {
          results.push({ lawName: law.name, pcode: law.pcode, articles });
        }
      }
    } catch { /* skip */ }
  }

  // If article numbers mentioned but no specific law, try 民法 as default
  if (mentionedLaws.length === 0 && articleNos.length > 0) {
    for (const no of articleNos) {
      try {
        const res = await fetch(
          `${LAW_API}/api/laws/B0000001/articles?article_no=${no}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json() as { articles?: LawArticle[] };
        if (data.articles?.length) {
          const existing = results.find(r => r.pcode === 'B0000001');
          if (existing) existing.articles.push(...data.articles);
          else results.push({ lawName: '民法', pcode: 'B0000001', articles: [...data.articles] });
        }
      } catch { /* skip */ }
    }
  }

  return results;
}

// --- Build context for LLM ---

function clean(text: string): string {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function buildRulingId(r: SemanticResult): string {
  const court = r.jcourt || '';
  const year = r.jyear || '';
  const caseType = r.jcase || '';
  const no = r.jno || '';
  return `${court} ${year}年${caseType}字第${no}號`;
}

function buildContext(
  rulings: SemanticResult[],
  laws: Array<{ lawName: string; pcode: string; articles: LawArticle[] }>,
): string {
  const parts: string[] = [];

  // Law articles
  if (laws.length > 0) {
    parts.push('【相關法條】');
    let idx = 1;
    for (const law of laws) {
      for (const a of law.articles) {
        parts.push(`[法${idx}] ${law.lawName} ${a.article_no}：${clean(a.article_content)}`);
        idx++;
      }
    }
  }

  // Rulings from semantic search
  if (rulings.length > 0) {
    parts.push('\n【相關判決】');
    rulings.forEach((r, i) => {
      const id = buildRulingId(r);
      const score = (r.score * 100).toFixed(0);
      parts.push(`[判${i + 1}] ${r.jtitle} - ${id}（相似度 ${score}%）`);
      if (r.section) parts.push(`  段落：${r.section}`);
      if (r.chunk_text) parts.push(`  內容摘要：${clean(r.chunk_text).slice(0, 300)}`);
      parts.push('');
    });
  }

  return parts.join('\n');
}

function buildReferences(
  rulings: SemanticResult[],
  laws: Array<{ lawName: string; pcode: string; articles: LawArticle[] }>,
): Reference[] {
  const refs: Reference[] = [];

  // Law article references with links
  for (const law of laws) {
    for (const a of law.articles) {
      refs.push({
        label: `${law.lawName} ${a.article_no}`,
        type: 'law',
        link: `/law/${law.pcode}`,
      });
    }
  }

  // Ruling references with links
  for (const r of rulings) {
    refs.push({
      label: `${r.jtitle} - ${buildRulingId(r)}`,
      type: 'ruling',
      link: `/ruling/${encodeURIComponent(r.jid)}`,
    });
  }

  return refs;
}

function generateFollowUps(query: string, hasLaws: boolean, hasRulings: boolean): string[] {
  const ups: string[] = [];
  if (hasRulings) ups.push('這些判決的主要爭點有哪些共通之處？');
  if (hasLaws) ups.push('還有哪些相關的法律條文可以參考？');

  if (query.includes('賠償') || query.includes('損害')) ups.push('損害賠償金額在實務上通常如何計算？');
  else if (query.includes('契約') || query.includes('合約')) ups.push('契約違約的法律救濟有哪些？');
  else if (query.includes('勞') || query.includes('解僱') || query.includes('資遣')) ups.push('勞工被違法解僱有哪些救濟管道？');
  else if (query.includes('車禍') || query.includes('交通')) ups.push('車禍過失比例在實務上如何認定？');
  else if (query.includes('租') || query.includes('房')) ups.push('租賃糾紛常見的法律爭議有哪些？');
  else ups.push('可以進一步分析這些判決的法律見解嗎？');

  return ups.slice(0, 3);
}

// --- Main handler ---

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json() as ChatRequest;
    const { message, conversationHistory = [] } = body;

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400, headers });
    }

    // Step 1: Semantic search → find top 5 similar rulings
    const rulings = await semanticSearch(message);

    // Step 2: Extract law references from ruling chunks + user query
    const allText = [
      message,
      ...rulings.map(r => r.chunk_text || ''),
    ].join('\n');
    const extractedRefs = extractLawRefsFromText(allText);

    // Step 3: Fetch actual law article content for extracted references
    // Also include any laws explicitly mentioned in user's question
    const [extractedLaws, queryLaws] = await Promise.all([
      fetchLawArticles(extractedRefs),
      searchLawArticles(message),
    ]);

    // Merge laws (avoid duplicates)
    const lawMap = new Map<string, { lawName: string; pcode: string; articles: LawArticle[] }>();
    for (const law of [...extractedLaws, ...queryLaws]) {
      const existing = lawMap.get(law.pcode);
      if (existing) {
        const existingNos = new Set(existing.articles.map(a => a.article_no));
        for (const a of law.articles) {
          if (!existingNos.has(a.article_no)) existing.articles.push(a);
        }
      } else {
        lawMap.set(law.pcode, { ...law });
      }
    }
    const laws = Array.from(lawMap.values());

    const contextText = buildContext(rulings, laws);
    const references = buildReferences(rulings, laws);
    const followUps = generateFollowUps(message, laws.length > 0, rulings.length > 0);

    // Step 2: Build prompt
    const systemContent = [
      '你是台灣法律AI助手。根據以下檢索到的判決和法條，回答使用者的法律問題。',
      '',
      '回答規則：',
      '- 繁體中文回答',
      '- 引用法條標記 [法N]，引用判決標記 [判N]，N 對應下方資料編號',
      '- 使用 **粗體** 標示重點，用編號列表整理論點',
      '- 結構：先法律依據 → 再實務見解 → 最後具體建議',
      '- 務必引用下方提供的判決字號，讓使用者能查閱原文',
      '- 不要編造不存在的法條或判決',
      '- 結尾加上免責聲明',
      '',
      contextText || '（目前未檢索到直接相關資料，請根據法律知識回答，並提醒使用者查閱具體法條。）',
    ].join('\n');

    const aiMessages = [
      { role: 'system' as const, content: systemContent },
      ...conversationHistory.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Step 3: Call Qwen3-30B-A3B
    let fullText: string;
    try {
      // @ts-expect-error - model ID valid
      const aiResponse = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
        messages: aiMessages,
        max_tokens: 2048,
        temperature: 0.6,
      });

      const r = aiResponse as Record<string, unknown>;
      if (typeof r?.response === 'string' && r.response) {
        fullText = r.response;
      } else if (Array.isArray(r?.choices)) {
        fullText = ((r.choices as Array<{ message?: { content?: string } }>)[0]?.message?.content) || '';
      } else {
        fullText = '';
      }

      // Remove thinking blocks
      fullText = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      if (!fullText) throw new Error('Empty response');
    } catch (err) {
      console.error('AI error:', err);
      // Fallback: format the retrieved data directly
      if (contextText) {
        fullText = `**為您檢索到的相關法學資料：**\n\n${contextText}\n\n> ⚠️ AI 分析暫時無法使用，以上為原始搜尋結果供參考。`;
      } else {
        fullText = '抱歉，目前無法處理此問題。請使用精準搜尋功能查找相關判決和法條。';
      }
    }

    // Step 4: Stream to client
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // References (with links)
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'references', references })}\n\n`
        ));

        // Text chunks (typing effect)
        for (let i = 0; i < fullText.length; i += 4) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'token', token: fullText.slice(i, i + 4) })}\n\n`
          ));
        }

        // Follow-up questions
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'followups', questions: followUps })}\n\n`
        ));

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers },
    );
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
