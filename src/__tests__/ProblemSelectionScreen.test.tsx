import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";

import ProblemSelectionScreen from "../pages/ProblemSelectionScreen"; // テスト対象コンポーネント
import {
  BOOK_SOURCE_OPTIONS,
  PROBLEM_COUNT_OPTIONS,
  TIME_LIMIT_OPTIONS,
  DEFAULT_BOOK_SOURCE,
} from "@/constants/quizSettings";

// --- モックの設定 ---

// 1. useNavigate のモック化 (vi.mock を使用)
const mockNavigate = vi.fn(); // vi.fn() でモック関数を作成
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom"); // 実際のモジュールを取得
  return {
    ...(typeof actual === "object" ? actual : {}),
    useNavigate: () => mockNavigate,
  };
});

// 2. アイコンのモック (定数の一部をモック化)
// BOOK_SOURCE_OPTIONS の型を適切に定義 (必要であれば)
interface BookSourceOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}
vi.mock("@/constants/quizSettings", async () => {
  const actual = await vi.importActual<
    typeof import("@/constants/quizSettings")
  >("@/constants/quizSettings"); // 実際の定数を取得し型付け
  return {
    ...actual,
    BOOK_SOURCE_OPTIONS: actual.BOOK_SOURCE_OPTIONS.map(
      (opt: BookSourceOption) => ({
        ...opt,
        // テストではアイコン自体は重要でないため、単純な span に置き換え
        icon: <span data-testid={`icon-${opt.value}`}>Mock Icon</span>,
      })
    ),
  };
});

// --- テストスイートの開始 ---
describe("ProblemSelectionScreen", () => {
  // 各テストケースの前にモックの呼び出し履歴をクリア
  beforeEach(() => {
    mockNavigate.mockClear(); // or vi.clearAllMocks();
  });

  it("出題範囲を選択すると状態が更新される", async () => {
    const user = userEvent.setup(); // userEvent のセットアップ
    render(
      <BrowserRouter>
        <ProblemSelectionScreen />
      </BrowserRouter>
    );

    // -----------------------------------
    // 1. 変更したい選択肢を特定
    // -----------------------------------
    // 例として2番目のオプションを選択対象とする
    const targetOption = BOOK_SOURCE_OPTIONS[1]; // 'プリンシプルオブプログラミング' のデータ
    const targetLabelText = targetOption.label; // 'プリンシプルオブプログラミング'

    // -----------------------------------
    // 2. ユーザー操作: ラベルをクリックして選択を変更
    // -----------------------------------
    // ラベルテキストを持つ要素を探し、その親の <label> 要素を取得
    const targetLabelElement = screen
      .getByText(targetLabelText)
      .closest("label");
    // 要素が存在することを確認 (テストの堅牢性のため)
    expect(targetLabelElement).toBeInTheDocument();
    // ラベルをクリック
    await user.click(targetLabelElement!);

    // -----------------------------------
    // 3. アサーション: 状態が正しく更新されたか確認
    // -----------------------------------
    // 3a. クリックした選択肢のラジオボタンがチェックされているか
    const targetRadioInput = screen.getByRole("radio", {
      // name に "Mock Icon " を含める
      name: `Mock Icon ${targetLabelText}`,
    }) as HTMLInputElement;
    expect(targetRadioInput).toBeChecked();

    // 3b. 以前選択されていたデフォルトの選択肢のラジオボタンのチェックが外れているか
    // デフォルトの選択肢データを取得
    const defaultOption = BOOK_SOURCE_OPTIONS.find(
      (opt) => opt.value === DEFAULT_BOOK_SOURCE
    )!;
    const defaultRadioInput = screen.getByRole("radio", {
      // こちらの name にも "Mock Icon " を含める必要がありました
      name: `Mock Icon ${defaultOption.label}`,
    }) as HTMLInputElement;
    expect(defaultRadioInput).not.toBeChecked();
  });

  it("問題数を選択すると状態が更新される", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProblemSelectionScreen />
      </BrowserRouter>
    );

    // getByRole の代わりに getByTestId を使用
    const problemCountSelect = screen.getByTestId("problem-count-select");

    // --- テストする操作 ---
    const targetValue = PROBLEM_COUNT_OPTIONS[1].toString(); // 例: 10

    // userEvent.selectOptions は Select コンポーネントの実装によっては
    // うまく動作しない場合があります (特に Radix UI ベースの場合)。
    // 代わりにトリガーをクリックして、表示されるオプションをクリックする方法を試します。

    // 1. トリガーボタンをクリックしてドロップダウンを開く
    await user.click(problemCountSelect);

    // 2. 開かれたリストから目的のオプションを探してクリック
    //    オプションの role は 'option' が一般的
    //    name はオプションの表示テキスト (例: "10問")
    const optionToSelect = await screen.findByRole("option", {
      name: `${targetValue}問`,
    });
    await user.click(optionToSelect);

    // --- アサーション ---
    // Select の値が変更されたことを確認します。
    // Radix UI の Select では、トリガーボタンのテキスト内容で確認するのが一般的です。
    // トリガーボタン (combobox) が選択されたテキストを表示するはずです。
    expect(problemCountSelect).toHaveTextContent(`${targetValue}問`);

    // toHaveValue はネイティブ <select> 要素で有効なマッチャーであり、
    // Radix UI ベースのカスタムコンポーネントでは意図通りに動作しない場合があります。
    // expect(problemCountSelect).toHaveValue(targetValue); // ← これは失敗する可能性が高い
  });

  it("解答時間を選択すると状態が更新される", async () => {
    // it の説明を修正
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProblemSelectionScreen />
      </BrowserRouter>
    );

    // getByRole の代わりに getByTestId を使用
    const timeLimitSelect = screen.getByTestId("time-limit-select");

    // --- テストする操作 ---
    const targetValue = TIME_LIMIT_OPTIONS[1].toString(); // 例: 45

    // 1. トリガーボタンをクリックしてドロップダウンを開く
    await user.click(timeLimitSelect);

    // 2. 開かれたリストから目的のオプションを探してクリック
    //    オプションの role は 'option'
    //    name はオプションの表示テキスト (例: "45秒")
    const optionToSelect = await screen.findByRole("option", {
      name: `${targetValue}秒`,
    });
    await user.click(optionToSelect);

    // --- アサーション ---
    // トリガーボタン (combobox) のテキストが選択したオプションのテキストに更新されたか確認
    expect(timeLimitSelect).toHaveTextContent(`${targetValue}秒`);

    // toHaveValue はここでは使わない
    // expect(timeLimitSelect).toHaveValue(targetValue);
  });

  it("開始ボタンクリックで選択した値を使ってnavigateが呼ばれる", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <ProblemSelectionScreen />
      </BrowserRouter>
    );

    // --- 設定を変更 (例) ---

    // 1. 出題範囲を変更
    const targetBookOption = BOOK_SOURCE_OPTIONS[2]; // 例: '両方'
    // ラジオボタン要素を直接取得してクリックする (より直接的な方法)
    const targetBookRadio = screen.getByRole("radio", {
      name: `Mock Icon ${targetBookOption.label}`,
    });
    await user.click(targetBookRadio);

    // 2. 問題数を変更
    const problemCountSelect = screen.getByTestId("problem-count-select");
    const selectedProblemCount = PROBLEM_COUNT_OPTIONS[2].toString(); // 例: 15
    // トリガーをクリックしてドロップダウンを開く
    await user.click(problemCountSelect);
    // オプションを探してクリック
    const problemCountOption = await screen.findByRole("option", {
      name: `${selectedProblemCount}問`,
    });
    await user.click(problemCountOption);

    // 3. 解答時間を変更
    const timeLimitSelect = screen.getByTestId("time-limit-select");
    const selectedTimeLimit = TIME_LIMIT_OPTIONS[2].toString(); // 例: 30
    // トリガーをクリックしてドロップダウンを開く
    await user.click(timeLimitSelect);
    // オプションを探してクリック
    const timeLimitOption = await screen.findByRole("option", {
      name: `${selectedTimeLimit}秒`,
    });
    await user.click(timeLimitOption);

    // --- 開始ボタンをクリック ---
    const startButton = screen.getByRole("button", { name: "開始" });
    await user.click(startButton);

    // --- navigate が期待通り呼び出されたか確認 ---
    const expectedParams = new URLSearchParams({
      bookSource: targetBookOption.value,
      count: selectedProblemCount,
      timeLimit: selectedTimeLimit,
    }).toString();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(`/quiz?${expectedParams}`);
  });
});
