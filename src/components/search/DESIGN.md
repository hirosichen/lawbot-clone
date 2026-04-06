# SearchPage Visual & Interaction Spec

> Working design document for the SearchPage revamp. Structural feature parity with
> lawbot.tw, but with a distinctive, production-grade visual feel — tuned to the
> existing `primary-*` Tailwind v4 tokens and `gray-*` defaults, with full
> light / dark mode support.

Authors: `designer` (team search-revamp, task #4)
Audience: implementer agents for tasks #5, #6, #7, #8
Do NOT touch `src/pages/SearchPage.tsx` while implementing — the main page
integration is task #8.

---

## 1. Design principles

1. **Calm hierarchy, loud moments.** The hero "搜尋，可以很簡單" is the loudest
   thing on the page when empty. Everything else (filter row, chips) sits on a
   quiet baseline so results can breathe. When a query is active, the hero
   collapses and the result list becomes the loud layer.
2. **Primary indigo as accent, never as background wash.** `primary-600`
   (indigo-500) is reserved for focus rings, active tab pill, selected chip,
   favorite star, and the hero gradient underline. The rest of the UI is
   neutral gray-50 / white / gray-900.
3. **Rounded, but never pill-everywhere.** `rounded-full` only for: tab
   switcher, law chips, filter chips, pagination, star button. Cards and
   inputs use `rounded-2xl` for a calmer silhouette.
4. **Typography.** Noto Sans TC is already loaded. Hero uses
   `text-5xl md:text-6xl font-bold tracking-tight` with a subtle gradient.
   Body stays at `text-sm` / `text-base`.
5. **Motion is cheap but restrained.** 150-200ms transitions on hover,
   `active:scale-[0.98]` on clickable chips, `animate-fade-in` on popovers.
   No layout shift on tab switch.
6. **Dark mode is first-class.** Every class that sets a color MUST have a
   `dark:` pair. Backgrounds step: `white` -> `gray-900` (page),
   `gray-50` -> `gray-800/60` (surfaces), `gray-100` -> `gray-800` (chips).

---

## 2. Layout structure

### 2.1 States

The page has two visual states controlled by `urlQuery`:

| State       | Trigger               | Hero                          | Content below              |
|-------------|-----------------------|-------------------------------|-----------------------------|
| `idle`      | `!urlQuery`           | Large centered hero + tagline | Common laws grid + tips     |
| `results`   | `!!urlQuery`          | Collapsed sticky compact bar  | Result list + pagination    |

### 2.2 Overall container

```tsx
<div className="min-h-[calc(100svh-64px)] bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
  <div className="max-w-4xl mx-auto px-4 pt-10 pb-16 md:pt-16">
    {/* Hero (idle) | CompactBar (results) */}
    {/* ModeTabs + SearchInput + FilterRow */}
    {/* idle: CommonLawsSection  |  results: ResultList + Pagination */}
  </div>
</div>
```

### 2.3 Idle state composition (top to bottom)

1. **Hero** — centered, generous whitespace (`mt-8 mb-12`).
2. **Mode tabs** — pill switcher, centered (`mx-auto`).
3. **Search input** — large, 56px tall, strong focus ring.
4. **Filter row** — left cluster (type / date / history) + right cluster (sort).
5. **Common laws section** — heading + 4x3 grid of chips + "客製化" button.

### 2.4 Results state composition

1. **Compact bar (sticky)** — `sticky top-0 z-20 -mx-4 px-4 backdrop-blur`
   containing tabs (smaller) + search input (smaller) + filter row.
2. **Result count + sort summary**.
3. **Result list** — vertical stack, `space-y-3`.
4. **Pagination** (keyword only).

---

## 3. Component breakdown & file map

```
src/components/search/
  DESIGN.md                  # this file
  SearchHero.tsx             # big centered title (idle only)
  ModeTabs.tsx               # 關鍵字 / 語意 pill switcher
  SearchInput.tsx            # rounded-2xl input + leading icon + trailing TipsButton
  SearchTipsPopover.tsx      # ⓘ content: 法條 / 簡寫 / 字號 / 多詞
  FilterRow.tsx              # lays out the 4 filter controls + sort
  DocTypePopover.tsx         # [文件類型 ▾] chip + popover
  DateRangePopover.tsx       # [日期範圍 ▾] chip + popover (two date inputs)
  SearchHistoryButton.tsx    # [⏱ 歷史紀錄] chip that opens SearchHistoryDialog
  SearchHistoryDialog.tsx    # full modal with date-grouped history
  SortToggle.tsx             # [關聯度 | 日期] right-aligned segmented control
  CommonLawsSection.tsx      # heading + chip grid + 客製化 button
  CommonLawChip.tsx          # single chip
  CustomizeLawsModal.tsx     # 編輯常用法律 (N/20) modal
  ResultList.tsx             # wraps mapping + empty state
  ResultRow.tsx              # single result row (crown / type / title / snippet / star)
  TypeChip.tsx               # small colored type badge (裁判/法律/...)
  HighlightMark.tsx          # existing HighlightText, moved here
  CompactSearchBar.tsx       # results-state sticky bar wrapper
```

**Ownership for tasks:**
- Task #5: `SearchInput`, `SearchTipsPopover`, `FilterRow`, `DocTypePopover`,
  `DateRangePopover`, `SortToggle`.
- Task #6: `CommonLawsSection`, `CommonLawChip`, `CustomizeLawsModal`.
- Task #7: `SearchHistoryButton`, `SearchHistoryDialog`.
- Task #8: `SearchHero`, `ModeTabs`, `ResultList`, `ResultRow`, `TypeChip`,
  `CompactSearchBar`, and integration into `SearchPage.tsx`. `HighlightMark`
  can be moved as part of task #8.

---

## 4. Component specs

### 4.1 `SearchHero`

```tsx
<div className="text-center mb-10 md:mb-14 animate-fade-in">
  <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
    搜尋，
    <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
      可以很簡單
    </span>
  </h1>
  <p className="mt-4 text-base md:text-lg text-gray-500 dark:text-gray-400">
    關鍵字、法條號、字號，一個搜尋框就夠了
  </p>
</div>
```

Interaction: pure static. Only rendered when `!urlQuery`.

### 4.2 `ModeTabs`

Pill segmented control, centered when idle, left-aligned when compact.

```tsx
<div className="inline-flex items-center gap-0 bg-gray-100 dark:bg-gray-800/80 rounded-full p-1">
  <button
    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-white dark:bg-gray-900 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`}
  >
    關鍵字搜尋
  </button>
  {/* same for 語意搜尋 */}
</div>
```

States: default / hover / active. Active pill uses a subtle inner ring for
depth instead of a heavy shadow.

### 4.3 `SearchInput`

```tsx
<form onSubmit={...} className="relative group">
  <Search
    size={22}
    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors"
  />
  <input
    className="
      w-full h-14 pl-14 pr-14
      rounded-2xl
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-800
      text-base text-gray-900 dark:text-white placeholder-gray-400
      shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-8px_rgba(0,0,0,0.08)]
      dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_-8px_rgba(0,0,0,0.5)]
      focus:outline-none
      focus:border-primary-400 dark:focus:border-primary-600
      focus:ring-4 focus:ring-primary-500/15 dark:focus:ring-primary-500/25
      transition-all duration-200
    "
    placeholder="輸入關鍵字、法條號（民法70）或字號（112台上83）..."
  />
  <SearchTipsPopover /> {/* absolute right-4 top-1/2 -translate-y-1/2 */}
</form>
```

- Height: `h-14` (56px) when idle, `h-12` (48px) inside CompactSearchBar.
- Focus ring: 4px soft primary halo (`ring-primary-500/15`) — this is the
  "premium" tell.
- Semantic mode switches the `<input>` to a `<textarea rows={3}>` with the
  same classes minus `h-14`, plus `py-4 resize-none`.

### 4.4 `SearchTipsPopover` (ⓘ trailing button)

Trigger:

```tsx
<button
  type="button"
  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition"
  aria-label="搜尋小技巧"
>
  <Info size={18} />
</button>
```

Popover (appears on click, closes on outside click or `Esc`):

```tsx
<div className="absolute right-0 top-full mt-3 w-[340px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-5 z-30 animate-fade-in">
  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">搜尋小技巧</h4>
  <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
    <li><strong className="text-primary-600 dark:text-primary-400">法條搜尋</strong>：民法70、憲法23</li>
    <li><strong className="text-primary-600 dark:text-primary-400">簡寫支援</strong>：民訴法、刑訴法、憲訴法、行訴法</li>
    <li><strong className="text-primary-600 dark:text-primary-400">字號搜尋</strong>：112台上83、112年度台上字第83號</li>
    <li><strong className="text-primary-600 dark:text-primary-400">多詞搜尋</strong>：以空格分隔，例如「竊盜 緩刑」</li>
  </ul>
</div>
```

### 4.5 `FilterRow`

Horizontal row. Flex with `justify-between`; left cluster is filters, right
cluster is sort toggle. Wraps on mobile (sort drops to a new line).

```tsx
<div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
  <div className="flex items-center gap-2 flex-wrap">
    <DocTypePopover />
    <DateRangePopover />
    <SearchHistoryButton />
  </div>
  <SortToggle />
</div>
```

All filter chips share this base class (extract to a constant
`FILTER_CHIP_BASE` in `FilterRow.tsx`):

```
inline-flex items-center gap-1.5
h-9 px-3.5
rounded-full
text-xs font-medium
border
bg-white dark:bg-gray-900
border-gray-200 dark:border-gray-800
text-gray-600 dark:text-gray-300
hover:border-gray-300 dark:hover:border-gray-700
hover:bg-gray-50 dark:hover:bg-gray-800/60
active:scale-[0.97]
transition-all duration-150
```

Active state (when the filter has a non-default value):

```
border-primary-300 dark:border-primary-700
bg-primary-50 dark:bg-primary-950/40
text-primary-700 dark:text-primary-300
```

### 4.6 `DocTypePopover`

Trigger: filter chip with `Filter` icon + current label + `ChevronDown`.
Popover: small menu, anchored below-left.

Options (final, 8 types — per research report): `全部`, `法律`, `裁判`,
`憲法法庭`, `司法解釋`, `決議`, `法律問題`, `函釋`.

**Behavior:** multi-select checkboxes (NOT single-select). `全部` is a
special toggle — clicking it clears all others and selects only `全部`;
clicking any other type deselects `全部`. When nothing is checked, default
back to `全部`. Chip label shows `文件類型` when `全部`, otherwise shows
`文件類型 · N` where N = number of non-`全部` selections.

```tsx
<div className="absolute left-0 top-full mt-2 w-52 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-2 z-30 animate-fade-in">
  <div className="px-3 pb-2 text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
    文件類型
  </div>
  {options.map(opt => {
    const checked = selected.includes(opt);
    return (
      <label className="flex items-center gap-3 px-3 h-9 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle(opt)}
          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/40"
        />
        <span className={`text-sm ${checked ? 'text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
          {opt}
        </span>
      </label>
    );
  })}
</div>
```

### 4.7 `DateRangePopover`

Trigger: filter chip with `CalendarRange` icon + "日期範圍" (or
"YYYY–YYYY" when set, e.g. "2018–2024").

Popover content: **dual-handle year range slider** (1945–2026) with label
"選擇年份範圍" + live value readout + presets + apply/clear.

```tsx
const MIN_YEAR = 1945;
const MAX_YEAR = 2026;

<div className="absolute left-0 top-full mt-2 w-[360px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-5 z-30 animate-fade-in">
  <div className="flex items-center justify-between mb-1">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">選擇年份範圍</h4>
    <span className="text-xs font-mono text-primary-600 dark:text-primary-400 tabular-nums">
      {fromYear} – {toYear}
    </span>
  </div>
  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">
    裁判書可查詢範圍：{MIN_YEAR} 至 {MAX_YEAR}
  </p>

  {/* Dual-handle slider — no extra dependency, built from 2 native range inputs
      stacked on the same track. Implementation notes in section 11. */}
  <div className="relative h-10 mb-2">
    {/* Track */}
    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />
    {/* Active range fill */}
    <div
      className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
      style={{
        left: `${((fromYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
        right: `${100 - ((toYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
      }}
    />
    {/* Two stacked native inputs for accessibility + keyboard. pointer-events
        are split so each handle catches only its side. */}
    <input
      type="range"
      min={MIN_YEAR}
      max={MAX_YEAR}
      value={fromYear}
      onChange={e => setFrom(Math.min(+e.target.value, toYear - 1))}
      className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto"
    />
    <input
      type="range"
      min={MIN_YEAR}
      max={MAX_YEAR}
      value={toYear}
      onChange={e => setTo(Math.max(+e.target.value, fromYear + 1))}
      className="range-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto"
    />
  </div>

  {/* Year tick labels */}
  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono tabular-nums mb-4">
    <span>{MIN_YEAR}</span>
    <span>1970</span>
    <span>1995</span>
    <span>{MAX_YEAR}</span>
  </div>

  {/* Presets */}
  <div className="flex gap-1.5 mb-4">
    {[
      { label: '近一年', from: MAX_YEAR - 1, to: MAX_YEAR },
      { label: '近三年', from: MAX_YEAR - 3, to: MAX_YEAR },
      { label: '近五年', from: MAX_YEAR - 5, to: MAX_YEAR },
      { label: '不限',   from: MIN_YEAR,     to: MAX_YEAR },
    ].map(p => (
      <button
        key={p.label}
        onClick={() => { setFrom(p.from); setTo(p.to); }}
        className="flex-1 h-7 rounded-full text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-700 dark:hover:text-primary-300 transition"
      >
        {p.label}
      </button>
    ))}
  </div>

  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
    <button onClick={clear} className="h-8 px-3 rounded-lg text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">清除</button>
    <button onClick={apply} className="h-8 px-4 rounded-lg text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-sm">套用</button>
  </div>
</div>
```

**Important:** the `DateRangePopover` operates on **years** in the UI, but
when applying it should write `date_from=YYYY-01-01` and `date_to=YYYY-12-31`
to the URL so the existing API contract (`date_from` / `date_to`) keeps
working unchanged. Implementer (task #5) owns this conversion inside
`DateRangePopover.tsx`.

### 4.8 `SearchHistoryButton` + `SearchHistoryDialog`

Button is just another filter chip: `Clock` icon + "歷史紀錄". On click, opens
the full `SearchHistoryDialog` modal (NOT a popover — lawbot.tw uses a dialog
because history can be long and grouped by date).

Dialog layout:

```tsx
<Dialog open={open} onClose={onClose}>
  <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />
  <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-fade-in overflow-hidden">
      <header className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">搜尋歷史</h3>
        <div className="flex items-center gap-1">
          <button className="h-8 px-3 rounded-lg text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1">
            <Trash2 size={12} /> 清除
          </button>
          <button onClick={onClose} className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="max-h-[60vh] overflow-y-auto">
        {groups.map(g => (
          <section key={g.label}>
            <h4 className="px-5 pt-4 pb-2 text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
              {g.label} {/* 今天 / 昨天 / 本週 / 更早 */}
            </h4>
            <ul>
              {g.items.map(item => (
                <li>
                  <button className="w-full flex items-center gap-3 px-5 h-11 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                    <Clock size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-200">{item.query}</span>
                    <ModeChip mode={item.mode} /> {/* small pill: 關鍵字 / 語意 */}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">尚無搜尋紀錄</div>
        )}
      </div>
    </div>
  </div>
</Dialog>
```

`ModeChip`: `text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400` — amber-tinted when `semantic`.

Date grouping rules (implementer): `今天` = same calendar day, `昨天` =
previous day, `本週` = within last 7 days excluding above, `更早` = rest.

### 4.9 `SortToggle`

Right-aligned segmented control, mirrors `ModeTabs` but smaller and with a
divider between the two options for density.

```tsx
<div className="inline-flex items-center h-9 p-0.5 rounded-full bg-gray-100 dark:bg-gray-800/80">
  {(['relevance','date'] as const).map(key => (
    <button
      className={`h-8 px-4 rounded-full text-xs font-medium transition-all ${
        sort === key
          ? 'bg-white dark:bg-gray-900 text-primary-700 dark:text-primary-300 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
      }`}
    >
      {key === 'relevance' ? '關聯度' : '日期'}
    </button>
  ))}
</div>
```

Semantic mode hides `SortToggle` (server doesn't support it).

### 4.10 `CommonLawsSection`

Only visible in idle state.

```tsx
<section className="mt-12">
  <header className="flex items-end justify-between mb-5">
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">常用法律</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">點擊快速查閱，或客製化成你的常用清單</p>
    </div>
    <button className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1">
      <Settings2 size={14} /> 客製化
    </button>
  </header>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
    {laws.map(law => <CommonLawChip key={law.code} law={law} />)}
  </div>
</section>
```

### 4.11 `CommonLawChip`

```tsx
<button
  onClick={() => navigate(`/law/${law.code}`)}
  className="
    group relative
    h-12 px-4
    rounded-xl
    bg-white dark:bg-gray-900
    border border-gray-200 dark:border-gray-800
    text-sm font-medium text-gray-700 dark:text-gray-200
    text-left
    hover:-translate-y-0.5
    hover:border-primary-300 dark:hover:border-primary-700
    hover:bg-primary-50/40 dark:hover:bg-primary-950/20
    hover:text-primary-700 dark:hover:text-primary-300
    hover:shadow-[0_4px_16px_-8px_rgba(99,102,241,0.4)]
    active:translate-y-0 active:scale-[0.98]
    transition-all duration-200
  "
>
  <span className="block truncate">{law.name}</span>
  <span className="block text-[10px] text-gray-400 dark:text-gray-500 group-hover:text-primary-500/70 truncate">
    {law.subtitle /* e.g. "民 Civil" */}
  </span>
</button>
```

Subtle hover lift (`-translate-y-0.5`) + colored glow shadow is the design
signature here. Never apply the hover lift inside a `CompactSearchBar`.

### 4.12 `CustomizeLawsModal`

Header: "編輯常用法律" + counter `<span className="text-xs text-gray-400">{selected.length}/20</span>`.

```tsx
<div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
  <header className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">編輯常用法律</h3>
      <span className="text-xs text-gray-400">{selected.length}/20</span>
    </div>
    <button className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"><X size={16}/></button>
  </header>
  <div className="px-5 py-4">
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
      <input placeholder="搜尋法律名稱..." className="w-full h-10 pl-10 pr-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/15"/>
    </div>
  </div>
  <div className="px-3 pb-2 max-h-[50vh] overflow-y-auto">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
      {filteredLaws.map(law => (
        <label className="flex items-center gap-3 px-3 h-10 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer">
          <input type="checkbox" checked={isSelected(law.code)} disabled={!isSelected(law.code) && selected.length >= 20} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500/40"/>
          <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{law.name}</span>
        </label>
      ))}
    </div>
  </div>
  <footer className="flex items-center justify-end gap-2 px-5 h-14 border-t border-gray-100 dark:border-gray-800">
    <button className="h-9 px-4 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">取消</button>
    <button className="h-9 px-5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-sm">儲存</button>
  </footer>
</div>
```

### 4.13 `ResultRow`

```tsx
<div
  onClick={() => navigate(`/ruling/${encodeURIComponent(r.jid)}`)}
  className="
    group relative cursor-pointer
    rounded-2xl
    bg-white dark:bg-gray-900
    border border-gray-200 dark:border-gray-800
    p-5
    hover:border-primary-300 dark:hover:border-primary-800
    hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.25)]
    dark:hover:shadow-[0_8px_32px_-12px_rgba(99,102,241,0.3)]
    transition-all duration-200
  "
>
  {/* Left color bar is rendered via ::before to avoid extra DOM */}
  <span className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-gray-200 dark:bg-gray-700 group-hover:bg-primary-500 transition-colors" />

  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <TypeChip type={r.type} /> {/* 裁判 / 法律 / 判例 ... */}
        {isSupremeCourt && <Crown size={14} className="text-amber-500 dark:text-amber-400" aria-label="最高法院" />}
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors truncate">
          <HighlightMark text={title} query={query} />
        </h3>
      </div>
      <p className="text-[13px] leading-[1.65] text-gray-600 dark:text-gray-400 line-clamp-2">
        <HighlightMark text={snippet} query={query} />
      </p>
      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
        {court} · {formatDate(date)}
      </p>
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
      className={`
        shrink-0 h-9 w-9 rounded-full flex items-center justify-center
        transition-all duration-200
        ${isFav
          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:scale-110'
          : 'text-gray-300 dark:text-gray-600 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:scale-110'
        }
      `}
      aria-label={isFav ? '取消收藏' : '加入收藏'}
    >
      {isFav ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
    </button>
  </div>
</div>
```

**Favorite icon decision:** per research report, keep the existing
`Bookmark` / `BookmarkCheck` (lucide-react) pair. Do NOT swap to Star. The
existing `useFavorites` store integration is also preserved as-is.

### 4.14 `TypeChip`

Color palette by type (light / dark):

| Type     | Bg                              | Text                        |
|----------|---------------------------------|-----------------------------|
| 裁判     | `primary-50 / primary-950/40`   | `primary-700 / primary-300` |
| 法律     | `emerald-50 / emerald-950/40`   | `emerald-700 / emerald-300` |
| 憲法法庭 | `rose-50 / rose-950/40`         | `rose-700 / rose-300`       |
| 司法解釋 | `purple-50 / purple-950/40`     | `purple-700 / purple-300`   |
| 決議     | `sky-50 / sky-950/40`           | `sky-700 / sky-300`         |
| 法律問題 | `teal-50 / teal-950/40`         | `teal-700 / teal-300`       |
| 函釋     | `amber-50 / amber-950/40`       | `amber-700 / amber-300`     |

```tsx
<span className={`inline-flex items-center h-5 px-2 rounded-md text-[10px] font-semibold tracking-wide ${colorMap[type]}`}>
  {type}
</span>
```

### 4.15 `HighlightMark`

Move existing `HighlightText` here verbatim, but change the mark color to
match the lawbot.tw yellow highlighter feel:

```tsx
<mark className="bg-yellow-200/80 dark:bg-yellow-900/40 text-inherit dark:text-yellow-100 rounded-[3px] px-0.5">
  {part}
</mark>
```

### 4.16 `CompactSearchBar`

When `urlQuery` is present, wrap `ModeTabs` + `SearchInput` + `FilterRow` in:

```tsx
<div className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-3 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60 dark:supports-[backdrop-filter]:bg-gray-950/60 border-b border-gray-200/60 dark:border-gray-800/60">
  {/* children */}
</div>
```

Inside CompactSearchBar, `SearchInput` uses `h-12` instead of `h-14`, and
`SearchHero` is not rendered at all.

---

## 5. Interaction states cheat-sheet

| Element            | Default          | Hover                    | Active / Selected                               | Focus                                  |
|--------------------|------------------|--------------------------|-------------------------------------------------|----------------------------------------|
| Mode tab           | gray text        | darker gray text         | white pill + primary-700 text + shadow-sm      | ring-2 ring-primary-500/40 (keyboard)  |
| Search input       | gray-200 border  | gray-300 border          | —                                               | primary-400 border + ring-4 primary/15 |
| Filter chip        | gray-200 border  | gray-300 + bg-gray-50    | primary-300 border + primary-50 bg + primary-700 text | ring-2 primary/40              |
| Common law chip    | gray-200 border  | primary-300 border + lift + glow | (not sticky, click navigates)           | ring-2 primary/40                      |
| Result row         | gray-200 border  | primary-300 border + shadow glow | —                                       | ring-2 primary/40 (when tab-focused)   |
| Bookmark button    | gray-300 icon    | primary-600 icon + primary-50 bg + scale-110 | primary-600 BookmarkCheck icon | ring-2 primary/40                      |
| Sort toggle        | gray pill        | darker text              | white pill + primary-700 + shadow-sm           | ring-2 primary/40                      |
| Tips popover btn   | gray-400 icon    | primary-600 icon + primary-50 bg | (open state same as hover)              | —                                      |
| Dialog close btn   | gray-400         | gray-700 + gray-100 bg   | —                                               | ring-2 primary/40                      |

---

## 6. Dark mode notes

- Page background: radial-ish `from-gray-50 via-white to-gray-50` light /
  flat `gray-950` dark. Avoid gradient in dark mode (looks muddy).
- Surface cards: `bg-white` light / `bg-gray-900` dark. Borders step down
  one: `border-gray-200` / `border-gray-800`.
- Shadows in dark mode use `rgba(0,0,0,0.3-0.5)` — Tailwind defaults are too
  subtle. Custom shadow tuples above already account for this.
- Primary accent in dark mode: always use the `300-400` tier for text, the
  `600-700` tier for fills/borders. Never `primary-50` backgrounds in dark
  (too bright) — use `primary-950/40` instead.
- `mark` yellow: `yellow-200/80` light, `yellow-900/40` dark. Text color
  inherits in light, forced to `yellow-100` in dark for contrast.

---

## 7. Responsive behavior

- Hero: `text-5xl` mobile, `text-6xl` desktop.
- Common laws grid: `grid-cols-2` mobile, `grid-cols-4` desktop.
- `FilterRow`: wraps; `SortToggle` drops to next line on `< sm`.
- `SearchHistoryDialog`: `max-w-lg`, with `px-4` gutter on mobile so it
  doesn't touch the edge.
- Compact bar sticky only on `md` and up (`md:sticky`) — on mobile it just
  scrolls with content to save vertical space.

---

## 8. Tokens & reusable class fragments to extract

Put at the top of `FilterRow.tsx` (or a small `tokens.ts` if more than 3
components reuse):

```ts
export const FILTER_CHIP_BASE =
  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:scale-[0.97] transition-all duration-150';

export const FILTER_CHIP_ACTIVE =
  'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300';

export const POPOVER_SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl animate-fade-in';

export const DIALOG_SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl animate-fade-in overflow-hidden';
```

---

## 9. Icons

From `lucide-react` (already installed). Mapping:

| Purpose            | Icon            |
|--------------------|-----------------|
| Search leading     | `Search`        |
| Tips trailing      | `Info`          |
| Doc type filter    | `Filter`        |
| Date range filter  | `CalendarRange` |
| History button     | `Clock`         |
| Sort (if needed)   | `ArrowUpDown`   |
| Favorite (inactive)| `Bookmark`      |
| Favorite (active)  | `BookmarkCheck` |
| Supreme court      | `Crown`         |
| Customize laws     | `Settings2`     |
| Close dialog       | `X`             |
| Delete history     | `Trash2`        |
| Checkmark menu     | `Check`         |

---

## 10. Dual-handle range slider thumb CSS

Native `input[type=range]` thumbs need cross-browser CSS to look like
designed handles. Add this to `src/index.css` (global) — one-time addition
owned by whoever implements `DateRangePopover.tsx` (task #5):

```css
/* Dual-range slider thumbs used by DateRangePopover */
.range-thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid var(--color-primary-500);
  box-shadow: 0 2px 6px -1px rgba(99, 102, 241, 0.45);
  cursor: grab;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.range-thumb::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.55);
}
.range-thumb::-webkit-slider-thumb:active {
  cursor: grabbing;
}
.range-thumb::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid var(--color-primary-500);
  box-shadow: 0 2px 6px -1px rgba(99, 102, 241, 0.45);
  cursor: grab;
}
:is(.dark) .range-thumb::-webkit-slider-thumb {
  background: var(--color-primary-950, #1e1b4b);
  border-color: var(--color-primary-400);
}
:is(.dark) .range-thumb::-moz-range-thumb {
  background: var(--color-primary-950, #1e1b4b);
  border-color: var(--color-primary-400);
}
```

Two stacked inputs trick: both inputs fill the same absolute box
(`absolute inset-0`), both have `pointer-events-none` on the track so clicks
pass through, but `::webkit-slider-thumb` re-enables `pointer-events: auto`
so only the draggable handles remain interactive. The clamp logic in the
`onChange` handlers (`Math.min(+value, toYear - 1)` / `Math.max(..., fromYear + 1)`)
prevents the handles from crossing, guaranteeing `fromYear < toYear`.

---

## 11. Out of scope for task #4

- Actual data plumbing (store additions, constants file) — tasks #2, #3.
- Implementing the components — tasks #5, #6, #7.
- Editing `SearchPage.tsx` — task #8.
- Build / commit / push — task #9.

This document is the source of truth for layout, class names, and
interaction states. If an implementer hits a decision not covered here, they
should ping `designer` rather than invent silently.
