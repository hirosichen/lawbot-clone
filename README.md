# LawSearch AI - 台灣法律 AI 搜尋引擎

台灣法律 AI 搜尋引擎，搜尋超過 2,160 萬筆裁判書、法律條文與司法解釋。

## 更新紀錄

### 2026-04-06
- 修復 React error #185（Maximum update depth exceeded）導致 /search、/favorites 頁面崩潰
  - `src/stores/favorites.ts`: 為 `useSyncExternalStore` 的 `getSnapshot` 加入快取機制，避免每次回傳新陣列參考導致無限重渲染
  - `src/pages/SearchPage.tsx`: 為搜尋歷史的 `getHistorySnapshot` 加入同樣的快取機制
  - `src/pages/FavoritesPage.tsx`: 修正 `folders` useMemo 依賴 `getFolders` 函式參考（每次重建）導致無限迴圈，改為直接依賴 `favorites` 資料
- 修復判決詳細頁面 `/ruling/:jid` 的 `c.map is not a function` 錯誤
  - `src/pages/RulingPage.tsx`: 引用分析的 API 回傳 `results` 欄位而非 `citations`，加入 `Array.isArray` 防禦性檢查並正確解析 `results` 欄位

---

## 技術架構

React + TypeScript + Vite

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
