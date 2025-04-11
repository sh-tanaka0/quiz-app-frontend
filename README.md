# React + TypeScript + Vite プロジェクト

このプロジェクトは、React、TypeScript、Vite を使用して構築されたモダンな Web アプリケーションです。以下にプロジェクトの目的、使用技術、実行方法、テスト戦略について詳しく説明します。

---

## プロジェクトの目的

このプロジェクトは、ユーザーインターフェースを効率的に構築するためのテンプレートとして機能します。以下のような特徴を持っています：

- **高速な開発環境**: Vite を使用した HMR（Hot Module Replacement）により、即時のフィードバックを得られます。
- **型安全性**: TypeScript を採用し、型安全な開発を実現します。
- **UI コンポーネント**: Radix UI や Tailwind CSS を活用した再利用可能なコンポーネントを提供します。

---

## 使用技術

- **フロントエンドフレームワーク**: React 18
- **ビルドツール**: Vite
- **型定義**: TypeScript
- **スタイリング**: Tailwind CSS
- **UI ライブラリ**: Radix UI
- **データ取得**: Axios
- **グラフ描画**: Recharts
- **ユーティリティ**: clsx, tailwind-merge
- **テスト**: Vitest, Testing Library, Happy DOM

---

## 実行方法

### 1. 必要な環境

- Node.js 16 以上
- npm または yarn

### 2. インストール

以下のコマンドを実行して依存関係をインストールします。

```bash
npm install
```

### 3. 開発サーバーの起動

開発環境を起動するには、以下を実行します。

```bash
npm run dev
```

### 4. ビルド

本番環境用にビルドするには、以下を実行します。

```bash
npm run build
```

### 5. テスト

テストを実行するには、以下を実行します。

```bash
npm run test
```

テストを監視モードで実行する場合は、以下を使用します。

```bash
npm run test:watch
```

---

## テスト戦略

このプロジェクトでは、以下のテスト戦略を採用しています。

### 使用ツール

- **Vitest**: 高速なテストランナー
- **Testing Library**: DOM 操作のテストを簡潔に記述
- **Happy DOM**: 軽量な DOM エミュレーター

### テストの知見

1. **`vi.hoisted` の使い方**  
   テスト間で共有するモックや変数を定義する際に`vi.hoisted`を活用しています。これにより、テストの可読性と再利用性が向上します。

2. **Happy DOM の採用理由**  
   JSDOM よりも軽量で高速な Happy DOM を採用しました。これにより、テストの実行速度が向上しました。

3. **非同期処理の待ち方**  
   非同期処理をテストする際は、`waitFor`を使用して DOM の状態が期待通りになるまで待機します。

   ```ts
   import { render, screen, waitFor } from "@testing-library/react";

   test("非同期データの表示", async () => {
     render(<MyComponent />);
     await waitFor(() =>
       expect(screen.getByText("データ読み込み完了")).toBeInTheDocument()
     );
   });
   ```

4. **要素特定の方針**  
   テスト対象の要素を特定する際は、`getByRole`や`getByLabelText`などのアクセシビリティに配慮したセレクタを優先的に使用しています。

---

## ディレクトリ構成

以下は、プロジェクトの主要なディレクトリ構成です。

```
react-app/
├── src/
│   ├── components/    # 再利用可能なReactコンポーネント
│   ├── pages/         # ページコンポーネント
│   ├── hooks/         # カスタムフック
│   ├── utils/         # ユーティリティ関数
│   ├── styles/        # グローバルスタイル
│   └── tests/         # テストコード
├── public/            # 静的ファイル
├── package.json       # プロジェクト設定
└── vite.config.ts     # Vite設定
```

---

## 注意事項

- **ESLint 設定**: 型認識ルールを有効にするため、`tsconfig.json`のパスを適切に設定してください。
- **テストカバレッジ**: `npm run coverage`でテストカバレッジを生成できます。

---

この README がプロジェクトの理解と開発効率向上の一助となれば幸いです。
