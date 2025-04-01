import { QuestionsApiResponse } from "@/types/quiz";

// プログラミング基礎知識に関するモック問題データ (10問)
export const mockQuizData: QuestionsApiResponse = {
  sessionId: "mock-session-xyz789",
  timeLimit: 300, // 10問 * 60秒 = 600秒
  questions: [
    // --- 問題 1 (リファクタリング) ---
    {
      id: "MOCK001",
      category: "リファクタリング",
      text: "コードの重複を削減するためのリファクタリング手法として最も適切なものはどれですか？",
      options: [
        { id: "A", text: "コピー&ペーストを多用する" },
        { id: "B", text: "共通の処理を関数やメソッドに抽出する" },
        {
          id: "C",
          text: "コードの長さを気にせず、読みやすさより機能性を重視する",
        },
        { id: "D", text: "エラーが発生したら、そのまま無視する" },
      ],
      correctAnswer: "B",
      explanation:
        "共通の処理を関数やメソッドに抽出することで、コードの重複をなくし、保守性や可読性を向上させることができます。",
    },
    // --- 問題 2 (エラーハンドリング) ---
    {
      id: "MOCK002",
      category: "エラーハンドリング",
      text: "JavaScriptでのエラーハンドリングについて、最も適切な方法はどれですか？",
      options: [
        { id: "A", text: "エラーを常に無視する" },
        { id: "B", text: "コンソールにエラーメッセージを出力するだけ" },
        {
          id: "C",
          text: "ユーザーに技術的な詳細なエラーメッセージを表示する",
        },
        {
          id: "D",
          text: "エラーをキャッチし、ユーザーフレンドリーなメッセージを表示する",
        },
      ],
      correctAnswer: "D",
      explanation:
        "try...catch構文などを用いてエラーを適切に捕捉し、ユーザーに分かりやすい形で通知または代替処理を行うことが重要です。",
    },
    // --- 問題 3 (オブジェクト指向) ---
    {
      id: "MOCK003",
      category: "オブジェクト指向",
      text: "オブジェクト指向プログラミングの依存性の逆転 (Dependency Inversion) について正しい説明はどれですか？",
      options: [
        { id: "A", text: "下位モジュールに高レベルモジュールを依存させる" },
        {
          id: "B",
          text: "具体的な実装よりも抽象化 (インターフェース) に依存させる",
        },
        { id: "C", text: "モジュール間の依存関係を完全になくす" },
        { id: "D", text: "常に具体的な実装に依存する" },
      ],
      correctAnswer: "B",
      explanation:
        "依存性の逆転原則は、上位モジュールも下位モジュールも具体的な実装ではなく、抽象（インターフェースや抽象クラス）に依存すべきであるという原則です。",
    },
    // --- 問題 4 (コード可読性) ---
    {
      id: "MOCK004",
      category: "コード可読性",
      text: "変数名を明確にするためには、どのような命名規則が推奨されますか？",
      options: [
        { id: "A", text: "できるだけ短い名前を使う" },
        { id: "B", text: "意味が明確に伝わる具体的な名前を使う" },
        { id: "C", text: "型情報を変数名に含める（ハンガリアン記法）" },
        { id: "D", text: "全て小文字でアンダースコア区切りにする" },
      ],
      correctAnswer: "B",
      explanation:
        "変数の目的や内容が一目でわかるような、具体的で意味のある名前を選ぶことが、コードの可読性を高める上で非常に重要です。",
    },
    // --- 問題 5 (変数命名) ---
    {
      id: "MOCK005",
      category: "変数命名",
      text: "一時的に使用するループカウンタ変数として、一般的に使われる名前はどれですか？",
      options: [
        { id: "A", text: "counterValue" },
        { id: "B", text: "loopIndexNumber" },
        { id: "C", text: "i, j, k" },
        { id: "D", text: "temp" },
      ],
      correctAnswer: "C",
      explanation:
        "短いスコープで一時的に使われるループカウンタ変数には、慣習的に `i`, `j`, `k` などが使われます。ただし、スコープが広がる場合はより具体的な名前が推奨されます。",
    },
    // --- 問題 6 (バージョン管理) ---
    {
      id: "MOCK006",
      category: "バージョン管理",
      text: "分散型バージョン管理システムとして広く使われているツールはどれですか？",
      options: [
        { id: "A", text: "Subversion (SVN)" },
        { id: "B", text: "CVS" },
        { id: "C", text: "Git" },
        { id: "D", text: "Microsoft Visual SourceSafe" },
      ],
      correctAnswer: "C",
      explanation:
        "Gitは、分散型アーキテクチャを採用しており、オフラインでのコミットやブランチ作成が容易なため、現代の開発で広く利用されています。",
    },
    // --- 問題 7 (テスト) ---
    {
      id: "MOCK007",
      category: "テスト",
      text: "ソフトウェアテストにおいて、コードの内部構造を考慮せず、入力と出力のみに着目してテストケースを作成する手法は何と呼ばれますか？",
      options: [
        { id: "A", text: "ホワイトボックステスト" },
        { id: "B", text: "ブラックボックステスト" },
        { id: "C", text: "グレーボックステスト" },
        { id: "D", text: "単体テスト" },
      ],
      correctAnswer: "B",
      explanation:
        "ブラックボックステストは、システムの内部構造を知らなくても、仕様に基づいて機能が期待通りに動作するかを確認するテスト手法です。",
    },
    // --- 問題 8 (アルゴリズム) ---
    {
      id: "MOCK008",
      category: "アルゴリズム",
      text: "データ構造の一つである「スタック (Stack)」の基本的な特徴を表す用語はどれですか？",
      options: [
        { id: "A", text: "FIFO (First-In, First-Out)" },
        { id: "B", text: "LIFO (Last-In, First-Out)" },
        { id: "C", text: "ランダムアクセス" },
        { id: "D", text: "キーと値のペア" },
      ],
      correctAnswer: "B",
      explanation:
        "スタックは、最後に追加された要素が最初に取り出される「後入れ先出し (LIFO)」のデータ構造です。例：関数の呼び出し履歴など。",
    },
    // --- 問題 9 (データベース) ---
    {
      id: "MOCK009",
      category: "データベース",
      text: "リレーショナルデータベースにおいて、テーブル間の関連付けを定義し、データの整合性を保つために使用される制約はどれですか？",
      options: [
        { id: "A", text: "主キー制約 (Primary Key)" },
        { id: "B", text: "外部キー制約 (Foreign Key)" },
        { id: "C", text: "一意性制約 (Unique)" },
        { id: "D", text: "NOT NULL制約" },
      ],
      correctAnswer: "B",
      explanation:
        "外部キー制約は、一方のテーブルの列が、他方のテーブルの主キーを参照するように設定し、関連するデータの整合性を保証します。",
    },
    // --- 問題 10 (セキュリティ) ---
    {
      id: "MOCK010",
      category: "セキュリティ",
      text: "Webアプリケーションの脆弱性の一つで、ユーザーからの入力を適切に処理せずにSQL文を組み立てることで、データベースを不正に操作される攻撃手法は何ですか？",
      options: [
        { id: "A", text: "クロスサイトスクリプティング (XSS)" },
        { id: "B", text: "クロスサイトリクエストフォージェリ (CSRF)" },
        { id: "C", text: "SQLインジェクション" },
        { id: "D", text: "ディレクトリトラバーサル" },
      ],
      correctAnswer: "C",
      explanation:
        "SQLインジェクションは、入力値検証の不備を利用して、攻撃者が意図しないSQL文を実行させる攻撃です。プレースホルダの使用などで対策します。",
    },
  ],
};
