import { useCallback, useSyncExternalStore } from 'react';

// --------------- Types ---------------

export interface ChatReference {
  label: string;
  type: 'law' | 'ruling';
  link?: string; // e.g. /ruling/xxx or /law/xxx
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: ChatReference[];
  followUpQuestions?: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

// --------------- Store ---------------

const STORAGE_KEY = 'lawbot-conversations';

let listeners: Array<() => void> = [];
let cachedRaw: string | null = null;
let cachedSnapshot: Conversation[] = [];

function emitChange() {
  cachedRaw = null;
  listeners.forEach((l) => l());
}

function getSnapshot(): Conversation[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  try {
    cachedSnapshot = raw ? JSON.parse(raw) : [];
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function save(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  emitChange();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --------------- Streaming state (not persisted) ---------------

let streamingConvId: string | null = null;
let streamingContent = '';
let streamingRefs: ChatReference[] = [];
let streamingFollowUps: string[] = [];
let streamingListeners: Array<() => void> = [];

function emitStreamChange() {
  streamingListeners.forEach((l) => l());
}

function subscribeStreaming(listener: () => void) {
  streamingListeners = [...streamingListeners, listener];
  return () => {
    streamingListeners = streamingListeners.filter((l) => l !== listener);
  };
}

export interface StreamingState {
  conversationId: string | null;
  content: string;
  references: ChatReference[];
  followUpQuestions: string[];
}

function getStreamingSnapshot(): StreamingState {
  return {
    conversationId: streamingConvId,
    content: streamingContent,
    references: streamingRefs,
    followUpQuestions: streamingFollowUps,
  };
}

// Stable reference for useSyncExternalStore
let cachedStreamingState: StreamingState = getStreamingSnapshot();
function getStableStreamingSnapshot(): StreamingState {
  const next = getStreamingSnapshot();
  if (
    next.conversationId !== cachedStreamingState.conversationId ||
    next.content !== cachedStreamingState.content ||
    next.references !== cachedStreamingState.references ||
    next.followUpQuestions !== cachedStreamingState.followUpQuestions
  ) {
    cachedStreamingState = next;
  }
  return cachedStreamingState;
}

// --------------- Real API streaming ---------------

async function streamChatResponse(
  conversationId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<void> {
  // Reset streaming state
  streamingConvId = conversationId;
  streamingContent = '';
  streamingRefs = [];
  streamingFollowUps = [];
  emitStreamChange();

  const chatApiUrl = '/api/chat';

  const res = await fetch(chatApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationHistory: history.slice(-6),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Chat API error: ${res.status} - ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);

        if (parsed.type === 'references') {
          streamingRefs = parsed.references || [];
          emitStreamChange();
        } else if (parsed.type === 'token') {
          streamingContent += parsed.token;
          emitStreamChange();
        } else if (parsed.type === 'followups') {
          streamingFollowUps = parsed.questions || [];
          emitStreamChange();
        }
      } catch {
        // skip malformed JSON
      }
    }
  }

  // Finalize: save completed message to localStorage
  const finalContent = streamingContent;
  const finalRefs = [...streamingRefs];
  const finalFollowUps = [...streamingFollowUps];

  // Clear streaming state
  streamingConvId = null;
  streamingContent = '';
  streamingRefs = [];
  streamingFollowUps = [];
  emitStreamChange();

  // Persist to store
  const all = getSnapshot();
  save(
    all.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: [
              ...c.messages,
              {
                id: generateId(),
                role: 'assistant' as const,
                content: finalContent,
                references: finalRefs,
                followUpQuestions: finalFollowUps,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : c,
    ),
  );
}

// --------------- Hook ---------------

export function useConversations() {
  const conversations = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id) ?? null,
    [conversations],
  );

  const createConversation = useCallback((title: string, firstMessage: string): Conversation => {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: generateId(),
      title,
      messages: [
        {
          id: generateId(),
          role: 'user',
          content: firstMessage,
          createdAt: now,
        },
      ],
      createdAt: now,
    };
    save([conv, ...getSnapshot()]);
    return conv;
  }, []);

  const addUserMessage = useCallback((conversationId: string, content: string) => {
    const all = getSnapshot();
    save(
      all.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: generateId(),
                  role: 'user' as const,
                  content,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : c,
      ),
    );
  }, []);

  const addAssistantMessage = useCallback(
    (conversationId: string, content: string, references?: ChatReference[], followUpQuestions?: string[]) => {
      const all = getSnapshot();
      save(
        all.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content,
                    references,
                    followUpQuestions,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : c,
        ),
      );
    },
    [],
  );

  const deleteConversation = useCallback((id: string) => {
    save(getSnapshot().filter((c) => c.id !== id));
  }, []);

  const deleteConversations = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    save(getSnapshot().filter((c) => !idSet.has(c.id)));
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, message: string) => {
      const conv = getSnapshot().find((c) => c.id === conversationId);
      const history = (conv?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      await streamChatResponse(conversationId, message, history);
    },
    [],
  );

  return {
    conversations,
    getConversation,
    createConversation,
    addUserMessage,
    addAssistantMessage,
    deleteConversation,
    deleteConversations,
    sendMessage,
  };
}

export function useStreamingState(): StreamingState {
  return useSyncExternalStore(subscribeStreaming, getStableStreamingSnapshot, getStableStreamingSnapshot);
}
