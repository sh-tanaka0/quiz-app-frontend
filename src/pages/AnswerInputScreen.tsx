import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";
import { Problem, AnswerPayload, AnswersApiResponse } from "@/types/quiz";
import { fetchQuizQuestions, submitQuizAnswers } from "@/services/api";
import { useTimer } from "@/hooks/useTimer";
import ProblemItem from "@/components/quiz/ProblemItem";
import NotificationToast from "@/components/quiz/NotificationToast";
import { mockQuizData } from "@/mocks/mockQuizData"; // モックデータを使用する場合

// --- モック設定 ---
const USE_MOCK_DATA = false; // バックエンド実装後に false にする

// --- コンポーネント定義 ---
const AnswerInputScreen = () => {
  // --- Hooks ---
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 初期設定値 ---
  const timeLimitPerQuestion = parseInt(
    searchParams.get("timeLimit") || "60",
    10
  );
  const problemCount = parseInt(searchParams.get("count") || "10", 10);
  const bookSource = searchParams.get("bookSource") || "readableCode"; // デフォルト値を設定
  const totalTime = timeLimitPerQuestion * problemCount;

  // --- Ref ---
  // State の最新値を useCallback 内で参照するために Ref を使用
  const selectedAnswersRef = useRef(selectedAnswers);
  const isSubmittingRef = useRef(isSubmitting);
  const currentProblemsRef = useRef(currentProblems); // currentProblems 用 Ref

  // --- Ref 更新 Effect ---
  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    currentProblemsRef.current = currentProblems;
  }, [currentProblems]); // currentProblems が更新されたら Ref も更新

  // --- 問題取得 Effect ---
  useEffect(() => {
    const loadProblems = async () => {
      setIsLoading(true);
      setError(null);
      // currentProblems をリセット（再取得時に前の問題が残らないように）
      setCurrentProblems([]);
      // selectedAnswers もリセット
      setSelectedAnswers({});

      if (USE_MOCK_DATA) {
        console.log("Loading problems using mock data...");
        try {
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay
          setSessionId(mockQuizData.sessionId);
          setCurrentProblems(mockQuizData.questions); // State を更新 -> Ref 更新 Effect が実行される
          console.log("Mock problems loaded:", mockQuizData.questions);
        } catch (err) {
          setError(err instanceof Error ? err.message : "モック問題読込エラー");
          console.error("Failed to load mock problems:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log("Fetching problems from API...");
        try {
          const data = await fetchQuizQuestions(
            bookSource,
            problemCount,
            timeLimitPerQuestion
          );
          setSessionId(data.sessionId);
          setCurrentProblems(data.questions); // State を更新 -> Ref 更新 Effect が実行される
          console.log("Problems fetched from API:", data.questions);
        } catch (err) {
          setError(err instanceof Error ? err.message : "問題読込エラー");
          console.error("Failed to fetch problems:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProblems();
    // 依存配列: クエリパラメータが変わったら問題を再取得
  }, [bookSource, problemCount, timeLimitPerQuestion]); // これらの値は通常安定している

  // --- 解答提出関数 (useCallback でメモ化し、Ref を使用) ---
  const handleSubmitRevised = useCallback(
    async (isTimeUp = false) => {
      // Ref を使って最新の isSubmitting 状態を確認
      if (isSubmittingRef.current && !isTimeUp) {
        console.log("Submission already in progress. Aborting.");
        return; // 時間切れ以外の多重送信を防止
      }

      setIsSubmitting(true); // State を更新 (isSubmittingRef も Effect で更新される)
      setError(null);
      const currentSelectedAnswers = selectedAnswersRef.current;
      const problemsToSubmit = currentProblemsRef.current; // Ref から最新の問題リストを取得

      // 問題リストが空の場合は何もしない（エラー防止）
      if (!problemsToSubmit || problemsToSubmit.length === 0) {
        console.warn("No problems to submit.");
        setIsSubmitting(false);
        return;
      }

      // 未解答チェック (時間切れでない場合)
      if (!isTimeUp) {
        const unansweredCount = problemsToSubmit.filter(
          (p) => !currentSelectedAnswers[p.questionId]
        ).length;
        if (unansweredCount > 0) {
          const confirmSubmit = window.confirm(
            `未解答の問題が ${unansweredCount} 問ありますが提出しますか？`
          );
          if (!confirmSubmit) {
            setIsSubmitting(false); // 送信中止
            return;
          }
        }
      }

      console.log("Submitting answers...");

      try {
        if (USE_MOCK_DATA) {
          console.log("Submitting answers using mock logic...");
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

          // モックの結果データを作成 (QuizResult[] 型)
          const originalProblemsMap = new Map(
            mockQuizData.questions.map((p) => [p.questionId, p])
          );
          const mockResultsData: AnswersApiResponse = {
            results: problemsToSubmit.map((problem) => {
              const originalProblemData = originalProblemsMap.get(
                problem.questionId
              );
              const userAnswer =
                currentSelectedAnswers[problem.questionId] || null;
              const isCorrect =
                userAnswer === originalProblemData?.correctAnswer;

              return {
                questionId: problem.questionId,
                category: originalProblemData?.category || "Unknown",
                isCorrect: isCorrect,
                userAnswer: userAnswer,
                correctAnswer: originalProblemData?.correctAnswer || "N/A",
                question:
                  originalProblemData?.question || "問題文が見つかりません",
                options: problem.options, // 画面表示に使った選択肢
                explanation:
                  originalProblemData?.explanation || "解説はありません。",
              };
            }),
          };

          console.log("Mock submission successful. Navigating to results.");
          navigate("/result", {
            state: {
              quizResults: mockResultsData.results,
              totalQuestions: problemsToSubmit.length,
              correctQuestions: mockResultsData.results.filter(
                (r) => r.isCorrect
              ).length,
            },
          });
        } else {
          // --- 実際のAPI送信 ---
          const payload: AnswerPayload = {
            // sessionId は state から取得 (通常、セッション中に変わらない想定)
            sessionId: sessionId,
            answers: problemsToSubmit.map((problem) => ({
              questionId: problem.questionId,
              answer: currentSelectedAnswers[problem.questionId] || null,
            })),
          };

          console.log("Submitting answers payload:", payload);
          const resultsData = await submitQuizAnswers(payload);
          console.log("API submission successful. Navigating to results.");

          navigate("/result", {
            state: {
              quizResults: resultsData.results,
              totalQuestions: problemsToSubmit.length,
              correctQuestions: resultsData.results.filter((r) => r.isCorrect)
                .length,
            },
          });
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "解答の提出中にエラーが発生しました。";
        setError(errorMsg);
        console.error("Failed to submit answers:", err);
      } finally {
        setIsSubmitting(false); // 成功・失敗に関わらず State を更新
      }
    },
    // ↓↓↓ 依存配列: currentProblems を削除し、安定した値のみにする
    [navigate, sessionId]
    // 注意: sessionId が安定しているか確認。もし fetchQuizQuestions のたびに変わるなら Ref化 が必要かも。
    // selectedAnswersRef, currentProblemsRef, isSubmittingRef は Ref なので依存配列に含めない
  );

  // --- 時間切れ処理用コールバック (useCallback でメモ化) ---
  const handleTimeUp = useCallback(async () => {
    console.log("Timer: Time's up! Triggering submission.");
    // Ref を使って最新の isSubmitting 状態を確認してから実行
    if (!isSubmittingRef.current) {
      await handleSubmitRevised(true); // メモ化された handleSubmitRevised を呼び出す
    } else {
      console.log(
        "Timer: Submission already in progress, skipping time-up submit."
      );
    }
  }, [handleSubmitRevised]); // handleSubmitRevised の参照が変わらない限り再生成されない

  // --- カスタムフック (useTimer) 呼び出し ---
  const initialTimerValue = isLoading ? 0 : totalTime;
  const {
    timeRemaining,
    warningLevel,
    timerColorClass,
    formattedTime,
    notification,
  } = useTimer(initialTimerValue, {
    onTimeUp: handleTimeUp, // メモ化されたコールバックを渡す
  });

  // --- イベントハンドラ (回答選択) ---
  const handleAnswerSelect = useCallback(
    (problemId: string, choiceId: string) => {
      // 時間切れ、または送信中は選択不可
      if (timeRemaining <= 0 || isSubmittingRef.current) return; // Ref で判定
      setSelectedAnswers((prev) => ({ ...prev, [problemId]: choiceId }));
    },
    [timeRemaining] // isSubmitting を Ref で管理しているので依存配列から削除
  );

  // --- 離脱防止 Effect ---
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Ref を使って最新の状態を確認
      if (
        timeRemaining > 0 &&
        !isSubmittingRef.current && // Ref で判定
        Object.keys(selectedAnswersRef.current).length > 0 // Ref で判定
      ) {
        event.preventDefault();
        event.returnValue =
          "解答中にページを離れると、進捗が失われる可能性があります。よろしいですか？";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [timeRemaining]); // isSubmitting, selectedAnswers を Ref で管理しているので依存配列から削除

  // --- レンダリング ---
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        問題を読み込んでいます...
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto p-4 text-center text-red-600">
        <AlertTriangle className="inline-block mr-2" />
        エラー: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      {/* 通知コンポーネント呼び出し */}
      <NotificationToast
        message={notification.message}
        level={notification.level}
        colorClass={timerColorClass}
        show={notification.show}
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between border-b p-4">
          <CardTitle className="text-xl mb-2 sm:mb-0">
            問題解答 ({currentProblems.length}問)
          </CardTitle>
          {/* タイマー表示 */}
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50 border">
            <Clock size={20} className={timerColorClass} />
            <div>
              <span
                className={`font-bold text-lg ${timerColorClass} ${
                  warningLevel === "critical" && timeRemaining > 0
                    ? "animate-pulse"
                    : ""
                }`}
              >
                {formattedTime} {/* useTimerから取得 */}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {/* 問題リストをProblemItemコンポーネントで表示 */}
          {currentProblems.map((problem, index) => (
            <ProblemItem
              key={problem.questionId}
              problem={problem}
              index={index}
              selectedAnswer={selectedAnswers[problem.questionId] || null}
              onAnswerSelect={handleAnswerSelect}
              isTimeUp={timeRemaining <= 0}
              isSubmitting={isSubmitting}
            />
          ))}

          {/* 解答ボタン */}
          <Button
            className={`w-full mt-4 text-white text-lg py-3 ${
              timeRemaining <= 0 || isSubmitting
                ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            onClick={() => handleSubmitRevised()}
            disabled={timeRemaining <= 0 || isSubmitting}
          >
            {isSubmitting ? "提出中..." : "解答する"}
          </Button>

          {/* エラー表示 */}
          {error && (
            <p className="mt-4 text-center text-red-600">
              {" "}
              <AlertTriangle className="inline-block mr-1" size={16} /> {error}{" "}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnswerInputScreen;
