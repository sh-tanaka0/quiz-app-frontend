import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface Problem {
  id: number;
  text: string;
  choices: { label: string; text: string }[];
  correctAnswer?: string;
  category?: string;
  explanation?: string;
}

// モックデータ (本来はAPIや外部ファイルから取得)
const allMockProblems: Problem[] = [
  {
    id: 1,
    category: "リファクタリング",
    text: "コードの重複を削減するためのリファクタリング手法として最も適切なものはどれですか？",
    choices: [
      { label: "A", text: "コピー&ペーストを多用する" },
      { label: "B", text: "共通の処理を関数やメソッドに抽出する" },
      {
        label: "C",
        text: "コードの長さを気にせず、読みやすさより機能性を重視する",
      },
      { label: "D", text: "エラーが発生したら、そのまま無視する" },
    ],
    correctAnswer: "B",
    explanation:
      "共通の処理を関数やメソッドに抽出することで、コードの重複をなくし、保守性や可読性を向上させることができます。",
  },
  {
    id: 2,
    category: "エラーハンドリング",
    text: "JavaScriptでのエラーハンドリングについて、最も適切な方法はどれですか？",
    choices: [
      { label: "A", text: "エラーを常に無視する" },
      { label: "B", text: "コンソールにエラーメッセージを出力するだけ" },
      {
        label: "C",
        text: "ユーザーに技術的な詳細なエラーメッセージを表示する",
      },
      {
        label: "D",
        text: "エラーをキャッチし、ユーザーフレンドリーなメッセージを表示する",
      },
    ],
    correctAnswer: "D",
    explanation:
      "try...catch構文などを用いてエラーを適切に捕捉し、ユーザーに分かりやすい形で通知または代替処理を行うことが重要です。",
  },
  {
    id: 3,
    category: "オブジェクト指向",
    text: "オブジェクト指向プログラミングの依存性の逆転 (Dependency Inversion) について正しい説明はどれですか？",
    choices: [
      { label: "A", text: "下位モジュールに高レベルモジュールを依存させる" },
      {
        label: "B",
        text: "具体的な実装よりも抽象化 (インターフェース) に依存させる",
      },
      { label: "C", text: "モジュール間の依存関係を完全になくす" },
      { label: "D", text: "常に具体的な実装に依存する" },
    ],
    correctAnswer: "B",
    explanation:
      "依存性の逆転原則は、上位モジュールも下位モジュールも具体的な実装ではなく、抽象（インターフェースや抽象クラス）に依存すべきであるという原則です。",
  },
  {
    id: 4,
    category: "コード可読性",
    text: "変数名を明確にするためには、どのような命名規則が推奨されますか？",
    choices: [
      { label: "A", text: "できるだけ短い名前を使う" },
      { label: "B", text: "意味が明確に伝わる具体的な名前を使う" },
      { label: "C", text: "型情報を変数名に含める（ハンガリアン記法）" },
      { label: "D", text: "全て小文字でアンダースコア区切りにする" },
    ],
    correctAnswer: "B",
    explanation:
      "変数の目的や内容が一目でわかるような、具体的で意味のある名前を選ぶことが、コードの可読性を高める上で非常に重要です。",
  },
  {
    id: 5,
    category: "変数命名",
    text: "一時的に使用するループカウンタ変数として、一般的に使われる名前はどれですか？",
    choices: [
      { label: "A", text: "counterValue" },
      { label: "B", text: "loopIndexNumber" },
      { label: "C", text: "i, j, k" },
      { label: "D", text: "temp" },
    ],
    correctAnswer: "C",
    explanation:
      "短いスコープで一時的に使われるループカウンタ変数には、慣習的に `i`, `j`, `k` などが使われます。ただし、スコープが広がる場合はより具体的な名前が推奨されます。",
  },
];

const AnswerInputScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quizSettings } = location.state || {};

  // 設定がない場合や不正な場合はデフォルト値を使う
  const timeLimit = quizSettings?.timeLimit ?? 60; // デフォルト60秒
  const problemCount = quizSettings?.problemCount ?? 10; // デフォルト10問
  const bookSource = quizSettings?.bookSource ?? "readableCode"; // デフォルト

  // 問題リストの準備
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);

  useEffect(() => {
    // 指定された数だけ問題を取得
    const selected = allMockProblems.slice(0, problemCount);
    setCurrentProblems(selected);
  }, [problemCount, bookSource]);

  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: number]: string;
  }>({});

  // 総制限時間を計算（秒）
  const totalTime = timeLimit * problemCount;
  const [timeRemaining, setTimeRemaining] = useState(totalTime);

  // 通知状態の管理
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    level: "normal" | "notice" | "warning" | "critical";
  }>({
    show: false,
    message: "",
    level: "normal",
  });

  // 前回の警告レベルを記録するためのref
  const lastWarningLevelRef = useRef<string>("normal");

  // --- タイマーと通知ロジック ---
  // 時間閾値計算をメモ化
  const getTimeThresholds = useCallback(() => {
    const totalMinutes = Math.ceil(totalTime / 60);
    return {
      fifty: Math.ceil(totalMinutes * 0.5) * 60,
      thirty: Math.ceil(totalMinutes * 0.3) * 60,
      ten: Math.max(60, Math.ceil(totalMinutes * 0.1) * 60),
    };
  }, [totalTime]);

  const warningThresholds = getTimeThresholds();

  // 警告レベル判定関数をメモ化
  const getWarningLevel = useCallback(
    (remainingTime: number) => {
      if (remainingTime <= 0) return "critical"; // 時間切れも critical
      if (remainingTime <= warningThresholds.ten) return "critical";
      if (remainingTime <= warningThresholds.thirty) return "warning";
      if (remainingTime <= warningThresholds.fifty) return "notice";
      return "normal";
    },
    [warningThresholds]
  );

  // タイマーの色決定関数をメモ化
  const getTimerColor = useCallback((warningLevel: string) => {
    switch (warningLevel) {
      case "critical":
        return "text-red-600";
      case "warning":
        return "text-orange-500";
      case "notice":
        return "text-yellow-500";
      default:
        return "text-gray-700";
    }
  }, []);

  // 時間フォーマットをメモ化
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }, []);

  // 通知表示関数をメモ化
  const showNotification = useCallback(
    (message: string, level: "normal" | "notice" | "warning" | "critical") => {
      setNotification({ show: true, message, level });
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 5000);
    },
    []
  );

  // 特定時間の通知メッセージを生成する関数をメモ化
  const getTimeLevelMessage = useCallback(
    (warningLevel: string, remainingMinutes: number) => {
      switch (warningLevel) {
        case "notice":
          return `残り時間が半分（約${remainingMinutes}分）になりました`;
        case "warning":
          return `残り時間が30%（約${remainingMinutes}分）を切りました`;
        case "critical":
          return `残り時間が10%（約${remainingMinutes}分）を切りました！急いでください`;
        default:
          return "";
      }
    },
    []
  );

  // 解答提出処理
  const handleSubmit = useCallback(
    (isTimeUp = false) => {
      // 時間切れでない場合のみ確認ダイアログを表示
      if (!isTimeUp) {
        const unansweredProblems = currentProblems.filter(
          (p) => !selectedAnswers[p.id]
        );
        if (unansweredProblems.length > 0) {
          const confirmSubmit = window.confirm(
            "未解答の問題がありますが提出しますか？"
          );
          if (!confirmSubmit) return;
        }
      }

      console.log("Submitting answers:", selectedAnswers);

      // 結果画面に渡すデータを作成
      const results = currentProblems.map((problem) => ({
        id: problem.id,
        category: problem.category || "未分類",
        question: problem.text,
        choices: problem.choices,
        userAnswer: selectedAnswers[problem.id] || null, // 未解答はnull
        correctAnswer: problem.correctAnswer,
        isCorrect: selectedAnswers[problem.id] === problem.correctAnswer,
        explanation: problem.explanation || "解説はありません。",
      }));

      // 結果画面に遷移し、結果データを state で渡す
      navigate("/result", {
        state: {
          quizResults: results,
          totalQuestions: currentProblems.length,
          correctQuestions: results.filter((r) => r.isCorrect).length,
        },
      });
    },
    [currentProblems, navigate, selectedAnswers]
  );

  // タイマー処理
  useEffect(() => {
    // 設定が読み込まれてからタイマーを開始
    if (totalTime > 0 && currentProblems.length > 0) {
      setTimeRemaining(totalTime); // 初期時間設定
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // 0になる前にクリア
            clearInterval(timer);
            // 時間切れ時の処理 (例: 自動提出)
            console.log("Time's up! Auto-submitting...");
            handleSubmit(true); // 自動提出フラグを立てる
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [totalTime, currentProblems, handleSubmit]);

  // 警告レベルの変化と特定時間での通知処理（リファクタリング部分）
  useEffect(() => {
    // 時間切れの場合の処理
    if (
      timeRemaining <= 0 &&
      lastWarningLevelRef.current !== "critical-timeout"
    ) {
      showNotification("時間切れです！解答を提出します。", "critical");
      lastWarningLevelRef.current = "critical-timeout"; // 時間切れ通知済みフラグ
      return; // 以降の通知は行わない
    }
    if (timeRemaining <= 0) return; // 時間切れ後の通知は不要

    const currentWarningLevel = getWarningLevel(timeRemaining);
    const remainingMinutes = Math.ceil(timeRemaining / 60);

    // 警告レベル変化時の通知処理
    if (
      currentWarningLevel !== lastWarningLevelRef.current &&
      currentWarningLevel !== "normal"
    ) {
      const message = getTimeLevelMessage(
        currentWarningLevel,
        remainingMinutes
      );
      if (message) {
        showNotification(message, currentWarningLevel);
        lastWarningLevelRef.current = currentWarningLevel;
      }
    }

    // 特定の時間での通知 (重複を避けるためlastWarningLevelRefをチェック)
    if (
      timeRemaining === 300 &&
      !["notice", "warning", "critical"].includes(lastWarningLevelRef.current)
    ) {
      showNotification("残り5分です", "notice");
    } else if (
      timeRemaining === 180 &&
      !["warning", "critical"].includes(lastWarningLevelRef.current)
    ) {
      showNotification("残り3分です", "warning");
    } else if (
      timeRemaining === 60 &&
      lastWarningLevelRef.current !== "critical"
    ) {
      showNotification("残り1分です！", "critical");
    }

    // 最初のレベル設定のため（normalからの変化を検知するため）
    if (
      lastWarningLevelRef.current === "normal" &&
      currentWarningLevel !== "normal"
    ) {
      lastWarningLevelRef.current = currentWarningLevel; // 初回のレベル変化を記録
    }
  }, [timeRemaining, getWarningLevel, showNotification, getTimeLevelMessage]);

  // 回答選択処理
  const handleAnswerSelect = useCallback(
    (problemId: number, choiceLabel: string) => {
      // 時間切れの場合は選択不可にする
      if (timeRemaining <= 0) return;
      setSelectedAnswers((prev) => ({
        ...prev,
        [problemId]: choiceLabel,
      }));
    },
    [timeRemaining]
  );

  // 読み込み中または設定がない場合の表示
  if (!quizSettings || currentProblems.length === 0) {
    return (
      <div className="container mx-auto p-4 text-center">
        設定を読み込み中...
      </div>
    );
  }

  // 警告レベルとタイマー色
  const warningLevel = getWarningLevel(timeRemaining);
  const timerColorClass = getTimerColor(warningLevel);

  return (
    <div className="container mx-auto max-w-4xl p-4 relative">
      {/* スライドイン通知 */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center p-3 pr-4 rounded-lg shadow-lg border-l-4 bg-white
            ${
              notification.level === "critical"
                ? "border-red-600"
                : notification.level === "warning"
                ? "border-orange-500"
                : notification.level === "notice"
                ? "border-yellow-500"
                : "border-gray-300"
            }
            animate-slideInFromRight`}
        >
          <Clock size={20} className={getTimerColor(notification.level)} />
          <span className="ml-2 font-medium">{notification.message}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-xl">問題解答 ({problemCount}問)</CardTitle>
          <div className="flex items-center space-x-2 p-2 rounded-lg">
            <Clock size={20} className={timerColorClass} />
            <div>
              <span
                className={`font-bold text-lg ${timerColorClass} ${
                  warningLevel === "critical" && timeRemaining > 0
                    ? "animate-pulse"
                    : ""
                }`}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentProblems.map((problem, index) => (
            <div
              key={problem.id}
              className="mb-6 pb-4 border-b last:border-b-0"
            >
              <h2 className="text-lg font-semibold mb-4">
                問題 {index + 1}: {problem.text}
              </h2>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                {problem.choices.map((choice) => (
                  <div
                    key={choice.label}
                    onClick={() => handleAnswerSelect(problem.id, choice.label)}
                    className={`
                      p-3 rounded border cursor-pointer transition-all duration-150 ease-in-out
                      flex items-center space-x-3 group
                      ${
                        selectedAnswers[problem.id] === choice.label
                          ? "bg-blue-100 border-blue-500 ring-2 ring-blue-300"
                          : timeRemaining <= 0
                          ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-gray-50 hover:bg-gray-100 hover:border-gray-300 border-gray-200"
                      }
                    `}
                    style={{ opacity: timeRemaining <= 0 ? 0.7 : 1 }}
                  >
                    <div
                      className={`
                        w-4 h-4 rounded-full border-2 flex items-center justify-center
                        ${
                          selectedAnswers[problem.id] === choice.label
                            ? "border-blue-600 bg-blue-500"
                            : "border-gray-400 group-hover:border-gray-500"
                        }
                        ${timeRemaining <= 0 ? "border-gray-300" : ""}
                     `}
                    >
                      {selectedAnswers[problem.id] === choice.label && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium mr-1">{choice.label}:</span>
                      {choice.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button
            className={`w-full mt-4 text-white ${
              timeRemaining <= 0
                ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            onClick={() => handleSubmit()}
            disabled={timeRemaining <= 0}
          >
            解答する
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnswerInputScreen;
