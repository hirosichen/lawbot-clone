import type { LawItem } from '../types';

export const ALL_LAWS: LawItem[] = [
  // 民事
  { id: 'civil-law', name: '民法', category: '民事' },
  { id: 'civil-procedure', name: '民事訴訟法', category: '民事' },
  { id: 'family-act', name: '家事事件法', category: '民事' },
  { id: 'consumer-protection', name: '消費者保護法', category: '民事' },
  { id: 'condominium-act', name: '公寓大廈管理條例', category: '民事' },
  { id: 'civil-law-enforcement', name: '民法總則施行法', category: '民事' },

  // 刑事
  { id: 'criminal-law', name: '中華民國刑法', category: '刑事' },
  { id: 'criminal-procedure', name: '刑事訴訟法', category: '刑事' },
  { id: 'anti-corruption', name: '貪污治罪條例', category: '刑事' },
  { id: 'anti-money-laundering', name: '洗錢防制法', category: '刑事' },

  // 勞動/商業
  { id: 'labor-standards', name: '勞動基準法', category: '勞動' },
  { id: 'gender-equality-work', name: '性別平等工作法', category: '勞動' },
  { id: 'company-act', name: '公司法', category: '商業' },

  // 憲法
  { id: 'constitution', name: '中華民國憲法', category: '憲法' },
  { id: 'constitution-amendments', name: '中華民國憲法增修條文', category: '憲法' },
  { id: 'constitution-preparation', name: '憲法實施之準備程序', category: '憲法' },
  { id: 'tutelage-conclusion', name: '訓政結束程序法', category: '憲法' },
  { id: 'mobilization-provisions', name: '動員戡亂時期臨時條款', category: '憲法' },

  // 行政
  { id: 'administrative-procedure', name: '行政程序法', category: '行政' },
  { id: 'administrative-litigation', name: '行政訴訟法', category: '行政' },
  { id: 'state-compensation', name: '國家賠償法', category: '行政' },

  // 智慧財產 / 資料
  { id: 'copyright-act', name: '著作權法', category: '智慧財產' },
  { id: 'trademark-act', name: '商標法', category: '智慧財產' },
  { id: 'patent-act', name: '專利法', category: '智慧財產' },
  { id: 'personal-data-protection', name: '個人資料保護法', category: '資料' },
];

export const DEFAULT_COMMON_LAW_IDS: string[] = [
  'civil-law',
  'civil-procedure',
  'family-act',
  'consumer-protection',
  'condominium-act',
  'criminal-law',
  'criminal-procedure',
  'anti-corruption',
  'anti-money-laundering',
  'labor-standards',
  'company-act',
  'constitution',
];
