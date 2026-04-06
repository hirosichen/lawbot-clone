import { useCallback, useSyncExternalStore } from 'react';

// --------------- Types ---------------

export interface ChatReference {
  label: string;
  type: 'law' | 'ruling';
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

// --------------- Mock Data ---------------

const MOCK_REFERENCES: ChatReference[] = [
  { label: '民法第184條', type: 'law' },
  { label: '民法第185條', type: 'law' },
  { label: '民法第195條', type: 'law' },
  { label: '臺灣基隆地方法院114年度基簡字第1231號民事判決', type: 'ruling' },
  { label: '最高法院108年度台上字第2035號民事判決', type: 'ruling' },
  { label: '臺灣高等法院112年度上字第890號民事判決', type: 'ruling' },
];

const MOCK_RESPONSES = [
  `根據您的問題，以下為相關法律分析：

**一、侵權行為之成立要件**

依民法第184條第1項前段規定，因故意或過失，不法侵害他人之權利者，負損害賠償責任 [1]。其構成要件包含：

1. **加害行為**：須有積極作為或消極不作為
2. **行為不法**：須違反法律上之注意義務
3. **損害發生**：須有實際損害之存在 [2]
4. **因果關係**：加害行為與損害間須有相當因果關係

**二、連帶賠償責任**

若數人共同不法侵害他人之權利者，依民法第185條規定，連帶負損害賠償責任 [3]。造意人及幫助人，視為共同行為人。

**三、精神慰撫金**

依民法第195條第1項規定，不法侵害他人之身體、健康、名譽、自由、信用、隱私、貞操，或不法侵害其他人格法益而情節重大者，被害人雖非財產上之損害，亦得請求賠償相當之金額 [4]。

**四、實務見解**

實務上，法院認為損害賠償之範圍，應以相當因果關係為判斷標準 [5]。最高法院108年度台上字第2035號判決亦指出，侵權行為之認定，須就個案具體事實為綜合判斷 [6]。`,

  `針對您的問題，以下提供法律研究結果：

**一、契約責任概述**

依民法第227條規定，因可歸責於債務人之事由，致為不完全給付者，債權人得依關於給付遲延或給付不能之規定行使其權利 [1]。

**二、損害賠償範圍**

1. **所受損害**（積極損害）：因債務不履行所直接受到的財產減損 [2]
2. **所失利益**（消極損害）：依通常情形或已定之計劃可得預期之利益 [3]
3. 賠償範圍依民法第216條規定認定

**三、舉證責任**

依民事訴訟法第277條規定，當事人主張有利於己之事實者，就其事實有舉證之責任 [4]。實務上認為，主張權利存在之人，就權利發生之要件事實負舉證之責 [5]。

**四、實務判決要旨**

臺灣高等法院相關判決指出，契約當事人之一方遲延給付者，他方當事人得定相當期限催告其履行，如於期限內不履行時，得解除其契約 [6]。`,

  `以下為您的問題之法律分析摘要：

**一、勞動契約終止之合法性**

依勞動基準法第11條規定，雇主非有法定事由不得預告勞工終止勞動契約 [1]。法定事由包含：

1. 歇業或轉讓時
2. 虧損或業務緊縮時
3. 不可抗力暫停工作在一個月以上時
4. 業務性質變更，有減少勞工之必要 [2]
5. 勞工對於所擔任之工作確不能勝任時

**二、資遣費計算**

依勞工退休金條例第12條規定，適用新制之勞工，資遣費按每滿一年發給二分之一個月平均工資計算 [3]，最高以發給六個月平均工資為限。

**三、預告期間**

依勞動基準法第16條規定，雇主依第11條終止勞動契約者，應依工作年資給予預告期間 [4]：
- 繼續工作三個月以上一年未滿者：十日前預告
- 繼續工作一年以上三年未滿者：二十日前預告
- 繼續工作三年以上者：三十日前預告

**四、相關判決**

法院實務見解認為，雇主應就解僱之最後手段性負舉證責任 [5]，且應考量是否有其他較輕微之手段可資替代 [6]。`,
];

const MOCK_FOLLOW_UPS = [
  [
    '侵權行為的損害賠償範圍如何計算？',
    '共同侵權行為與單獨侵權行為有何不同？',
    '精神慰撫金的金額如何認定？',
  ],
  [
    '契約解除後的回復原狀義務為何？',
    '違約金與損害賠償的關係為何？',
    '消滅時效完成後的法律效果？',
  ],
  [
    '勞工被違法解僱可以請求什麼救濟？',
    '試用期間解僱是否適用勞基法？',
    '勞資爭議調解的程序為何？',
  ],
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getMockResponse(): { content: string; references: ChatReference[]; followUpQuestions: string[] } {
  const idx = Math.floor(Math.random() * MOCK_RESPONSES.length);
  return {
    content: MOCK_RESPONSES[idx],
    references: MOCK_REFERENCES.slice(0, 4 + Math.floor(Math.random() * 3)),
    followUpQuestions: MOCK_FOLLOW_UPS[idx],
  };
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

  const simulateResponse = useCallback(
    (conversationId: string): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mock = getMockResponse();
          addAssistantMessage(conversationId, mock.content, mock.references, mock.followUpQuestions);
          resolve();
        }, 1200 + Math.random() * 800);
      });
    },
    [addAssistantMessage],
  );

  return {
    conversations,
    getConversation,
    createConversation,
    addUserMessage,
    addAssistantMessage,
    deleteConversation,
    deleteConversations,
    simulateResponse,
  };
}
