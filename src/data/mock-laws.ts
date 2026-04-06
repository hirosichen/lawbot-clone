export interface LawArticle {
  number: number;
  title: string;
  content: string[];
  tags: string[];
}

export interface LawChapter {
  title: string;
  articles: LawArticle[];
}

export interface LawSection {
  title: string;
  chapters: LawChapter[];
}

export interface LawData {
  name: string;
  category: string;
  lastModified: string;
  effectNote: string;
  sections: LawSection[];
}

export const civilCode: LawData = {
  name: '民法',
  category: '行政 > 法務部 > 法律事務目',
  lastModified: '1100120 修正',
  effectNote:
    '本法自中華民國十八年十月十日施行。但本法總則施行法另有規定者，不在此限。',
  sections: [
    {
      title: '第一編 總則',
      chapters: [
        {
          title: '第一章 法例',
          articles: [
            {
              number: 1,
              title: '法源',
              content: ['民事，法律所未規定者，依習慣；無習慣者，依法理。'],
              tags: ['法源'],
            },
            {
              number: 2,
              title: '適用習慣之限制',
              content: ['民事所適用之習慣，以不背於公共秩序或善良風俗者為限。'],
              tags: ['適用習慣之限制'],
            },
          ],
        },
        {
          title: '第二章 人',
          articles: [
            {
              number: 6,
              title: '權利能力',
              content: ['人之權利能力，始於出生，終於死亡。'],
              tags: ['權利能力'],
            },
            {
              number: 7,
              title: '胎兒之權利能力',
              content: [
                '胎兒以將來非死產者為限，關於其個人利益之保護，視為既已出生。',
              ],
              tags: ['胎兒'],
            },
            {
              number: 8,
              title: '死亡宣告',
              content: [
                '失蹤人失蹤滿七年後，法院得因利害關係人或檢察官之聲請，為死亡之宣告。',
                '失蹤人為八十歲以上者，得於失蹤滿三年後，為死亡之宣告。',
                '失蹤人為遭遇特別災難者，得於特別災難終了滿一年後，為死亡之宣告。',
              ],
              tags: ['死亡宣告', '失蹤'],
            },
            {
              number: 9,
              title: '死亡宣告之推定',
              content: [
                '受死亡宣告者，以判決內所確定死亡之時，推定其為死亡。',
                '前項死亡之時，應為前條各項所定期間最後日終了之時。但有反證者，不在此限。',
              ],
              tags: ['死亡宣告'],
            },
            {
              number: 10,
              title: '住所',
              content: [
                '依一定事實，足認以久住之意思，住於一定之地域者，即為設定其住所於該地。',
                '一人同時不得有兩住所。',
              ],
              tags: ['住所'],
            },
            {
              number: 12,
              title: '成年',
              content: ['滿十八歲為成年。'],
              tags: ['成年'],
            },
            {
              number: 13,
              title: '未成年人之行為能力',
              content: [
                '未滿七歲之未成年人，無行為能力。',
                '滿七歲以上之未成年人，有限制行為能力。',
              ],
              tags: ['行為能力', '未成年人'],
            },
            {
              number: 14,
              title: '監護宣告',
              content: [
                '對於因精神障礙或其他心智缺陷，致不能為意思表示或受意思表示，或不能辨識其意思表示之效果者，法院得因本人、配偶、四親等內之親屬、最近一年有同居事實之其他親屬、檢察官、主管機關、社會福利機構、輔助人、意定監護受任人或其他利害關係人之聲請，為監護之宣告。',
                '受監護之原因消滅時，法院應依前項聲請權人之聲請，撤銷其宣告。',
                '法院對於監護之聲請，認為未達第一項之程度者，得依第十五條之一第一項規定，為輔助之宣告。',
                '受監護之原因消滅，而仍有輔助之必要者，法院得依第十五條之一第一項規定，變更為輔助之宣告。',
              ],
              tags: ['監護宣告'],
            },
            {
              number: 15,
              title: '受監護宣告之效果',
              content: ['受監護宣告之人，無行為能力。'],
              tags: ['監護宣告', '行為能力'],
            },
          ],
        },
        {
          title: '第三章 法人',
          articles: [
            {
              number: 25,
              title: '法人之成立',
              content: ['法人非依本法或其他法律之規定，不得成立。'],
              tags: ['法人'],
            },
            {
              number: 26,
              title: '法人之權利能力',
              content: [
                '法人於法令限制內，有享受權利、負擔義務之能力。但專屬於自然人之權利義務，不在此限。',
              ],
              tags: ['法人', '權利能力'],
            },
            {
              number: 27,
              title: '法人之代表',
              content: [
                '法人應設董事。董事有數人者，法人事務之執行，除章程另有規定外，取決於全體董事過半數之同意。',
                '董事就法人一切事務，對外代表法人。董事有數人者，除章程另有規定外，各董事均得代表法人。',
                '對於董事代表權所加之限制，不得對抗善意第三人。',
              ],
              tags: ['法人', '董事', '代表'],
            },
            {
              number: 28,
              title: '法人侵權責任',
              content: [
                '法人對於其董事或其他有代表權之人因執行職務所加於他人之損害，與該行為人連帶負賠償之責任。',
              ],
              tags: ['法人', '侵權', '連帶責任'],
            },
          ],
        },
        {
          title: '第四章 物',
          articles: [
            {
              number: 66,
              title: '不動產',
              content: ['稱不動產者，謂土地及其定著物。', '不動產之出產物，尚未分離者，為該不動產之部分。'],
              tags: ['不動產'],
            },
            {
              number: 67,
              title: '動產',
              content: ['稱動產者，為前條所稱不動產以外之物。'],
              tags: ['動產'],
            },
            {
              number: 68,
              title: '主物與從物',
              content: [
                '非主物之成分，常助主物之效用，而同屬於一人者，為從物。但交易上有特別習慣者，依其習慣。',
                '主物之處分，及於從物。',
              ],
              tags: ['主物', '從物'],
            },
          ],
        },
        {
          title: '第五章 法律行為',
          articles: [
            {
              number: 71,
              title: '強行規定',
              content: ['法律行為，違反強制或禁止之規定者，無效。但其規定並不以之為無效者，不在此限。'],
              tags: ['法律行為', '無效'],
            },
            {
              number: 72,
              title: '公序良俗',
              content: ['法律行為，有背於公共秩序或善良風俗者，無效。'],
              tags: ['公序良俗', '無效'],
            },
            {
              number: 73,
              title: '法定方式',
              content: ['法律行為，不依法定方式者，無效。但法律另有規定者，不在此限。'],
              tags: ['法定方式', '無效'],
            },
          ],
        },
      ],
    },
  ],
};

export const mockLaws: Record<string, LawData> = {
  'civil-code': civilCode,
};
