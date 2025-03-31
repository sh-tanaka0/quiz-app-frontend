import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface Problem {
  id: number;
  text: string;
  choices: { label: string; text: string }[];
}

interface AnswerInputScreenProps {
  timePerProblem?: 30 | 45 | 60 | 75 | 90; // 一問あたりの時間（秒）
  problemCount?: 5 | 10 | 15 | 20 | 25 | 30; // 問題数
}

const AnswerInputScreen: React.FC<AnswerInputScreenProps> = ({
  timePerProblem = 30,
  problemCount = 10,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: number]: string;
  }>({});

  // 総制限時間を計算（秒）
  const totalTime = timePerProblem * problemCount;
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

  // 警告表示のしきい値（割合ベース）- 切りのいい数字に調整
  const getTimeThresholds = () => {
    // 総時間を分単位で計算
    const totalMinutes = Math.ceil(totalTime / 60);

    return {
      fifty: Math.ceil(totalMinutes * 0.5) * 60, // 50%の時間を分単位で切り上げて秒に戻す
      thirty: Math.ceil(totalMinutes * 0.3) * 60, // 30%
      ten: Math.max(60, Math.ceil(totalMinutes * 0.1) * 60), // 10%（ただし最低1分）
    };
  };

  const warningThresholds = getTimeThresholds();

  // 現在の警告レベルを計算
  const getWarningLevel = (remainingTime: number) => {
    if (remainingTime <= warningThresholds.ten) return "critical";
    if (remainingTime <= warningThresholds.thirty) return "warning";
    if (remainingTime <= warningThresholds.fifty) return "notice";
    return "normal";
  };

  // 警告レベルに応じた色を返す
  const getTimerColor = (warningLevel: string) => {
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
  };

  const mockProblems: Problem[] = [
    {
      id: 1,
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
    },
    {
      id: 2,
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
    },
    {
      id: 3,
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
    },
  ];

  const handleAnswerSelect = (problemId: number, choiceLabel: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [problemId]: choiceLabel,
    }));
  };

  const handleSubmit = () => {
    const unansweredProblems = mockProblems.filter(
      (p) => !selectedAnswers[p.id]
    );

    if (unansweredProblems.length > 0) {
      const confirmSubmit = window.confirm(
        "未解答の問題がありますが提出しますか？"
      );
      if (!confirmSubmit) return;
    }

    console.log("Submitting answers:", selectedAnswers);
  };

  // タイマーロジック
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 通知を表示する関数
  const showNotification = (
    message: string,
    level: "normal" | "notice" | "warning" | "critical"
  ) => {
    setNotification({
      show: true,
      message,
      level,
    });

    // 5秒後に通知を非表示にする
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  // 警告レベルの変化を監視して通知を表示
  useEffect(() => {
    const currentWarningLevel = getWarningLevel(timeRemaining);

    // 前回と異なる警告レベルになった場合のみ通知
    if (currentWarningLevel !== lastWarningLevelRef.current) {
      // normal以外のレベルに変わった場合のみ通知
      if (currentWarningLevel !== "normal") {
        const remainingMinutes = Math.ceil(timeRemaining / 60);
        let message = "";

        switch (currentWarningLevel) {
          case "notice":
            message = `残り時間が半分（約${remainingMinutes}分）になりました`;
            break;
          case "warning":
            message = `残り時間が30%（約${remainingMinutes}分）を切りました`;
            break;
          case "critical":
            message = `残り時間が10%（約${remainingMinutes}分）を切りました！急いでください`;
            break;
        }

        showNotification(message, currentWarningLevel);
      }

      lastWarningLevelRef.current = currentWarningLevel;
    }

    // 切りのいい時間（5分、3分、1分）でも通知
    if (timeRemaining === 300) {
      // 5分
      showNotification("残り5分です", "notice");
    } else if (timeRemaining === 180) {
      // 3分
      showNotification("残り3分です", "warning");
    } else if (timeRemaining === 60) {
      // 1分
      showNotification("残り1分です！", "critical");
    }
  }, [timeRemaining]);

  // 時間をフォーマット（MM:SS）
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // 警告レベルを取得
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
          <CardTitle className="text-xl">問題解答</CardTitle>
          <div className="flex items-center space-x-2 p-2 rounded-lg">
            <Clock size={20} className={timerColorClass} />
            <div>
              <span
                className={`font-bold ${timerColorClass} ${
                  warningLevel === "critical" ? "animate-pulse" : ""
                }`}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mockProblems.map((problem) => (
            <div key={problem.id} className="mb-6 pb-4 border-b">
              <h2 className="text-lg font-semibold mb-4">
                問題 {problem.id}: {problem.text}
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {problem.choices.map((choice) => (
                  <div
                    key={choice.label}
                    onClick={() => handleAnswerSelect(problem.id, choice.label)}
                    className={`
                      p-3 rounded border cursor-pointer transition-all 
                      ${
                        selectedAnswers[problem.id] === choice.label
                          ? "bg-blue-100 border-blue-500"
                          : "bg-gray-100 hover:bg-gray-200"
                      }
                    `}
                  >
                    <span className="font-bold mr-2">{choice.label}:</span>
                    {choice.text}
                    {selectedAnswers[problem.id] === choice.label && (
                      <span className="ml-2 text-xs text-blue-600">選択中</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSubmit}
          >
            解答する
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnswerInputScreen;
