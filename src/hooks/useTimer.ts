// src/hooks/useTimer.ts
import { useState, useEffect, useRef, useCallback } from "react";
// 型定義をインポート (パスはプロジェクトに合わせて調整)
import { NotificationLevel } from "@/types/quiz";

// フックが返す値のインターフェース
export interface TimerState {
  timeRemaining: number; // 残り時間（秒）
  warningLevel: NotificationLevel; // 現在の警告レベル
  timerColorClass: string; // タイマー表示用のCSSクラス
  formattedTime: string; // MM:SS 形式の残り時間
  notification: {
    // 通知表示用の状態
    show: boolean;
    message: string;
    level: NotificationLevel;
  };
  isTimerRunning: boolean; // タイマーが動作中かどうかを示すフラグを追加
}

// フックのオプション
export interface TimerOptions {
  onTimeUp?: () => void; // 時間切れ時に実行するコールバック関数
}

/**
 * クイズのタイマー機能を提供するカスタムフック
 * @param initialTotalTime クイズの総制限時間（秒）
 * @param options オプション（時間切れコールバックなど）
 * @returns タイマーの状態と関連情報
 */
export const useTimer = (
  initialTotalTime: number,
  options?: TimerOptions
): TimerState => {
  const { onTimeUp } = options || {}; // オプションからコールバックを取得

  // --- State ---
  // 残り時間 (初期値は initialTotalTime だが、Effectで設定)
  const [timeRemaining, setTimeRemaining] = useState(
    initialTotalTime > 0 ? initialTotalTime : 0
  );
  // 通知表示用の State
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    level: NotificationLevel;
  }>({ show: false, message: "", level: "normal" });
  // タイマーがアクティブかどうかの State (初期値 false)
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // --- Ref ---
  // setInterval のタイマーIDを保持
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  // 最後に表示した通知の警告レベルを保持
  const lastWarningLevelRef = useRef<NotificationLevel>("normal");
  const timeUpNotifiedRef = useRef<boolean>(false);

  // --- ヘルパー関数 (useCallbackでメモ化) ---

  /** 警告レベルの閾値（秒）を計算 */
  const getTimeThresholds = useCallback(
    () => ({
      fifty: Math.ceil(initialTotalTime * 0.5), // 50%
      thirty: Math.ceil(initialTotalTime * 0.25), // 25% (仕様に合わせて変更)
      ten: Math.ceil(initialTotalTime * 0.1), // 10%
    }),
    [initialTotalTime]
  );

  /** 残り時間から警告レベルを判定 */
  const getWarningLevel = useCallback(
    (remaining: number): NotificationLevel => {
      // initialTotalTime が 0 以下、または timeRemaining が初期値と同じ場合は normal
      if (initialTotalTime <= 0 || remaining >= initialTotalTime)
        return "normal";

      const thresholds = getTimeThresholds();
      if (remaining <= 0) return "critical";
      if (remaining <= thresholds.ten) return "critical";
      if (remaining <= thresholds.thirty) return "warning";
      if (remaining <= thresholds.fifty) return "notice";
      return "normal";
    },
    [getTimeThresholds, initialTotalTime]
  ); // initialTotalTime を追加

  /** 警告レベルからタイマー表示色クラスを決定 */
  const getTimerColor = useCallback((level: NotificationLevel): string => {
    switch (level) {
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

  /** 秒数を MM:SS 形式にフォーマット */
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }, []);

  /** 秒数を詳細な時間文字列 (○分○秒 / ○分 / ○秒) にフォーマット */
  const formatDetailedTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "0秒";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0 && remainingSeconds > 0)
      return `${minutes}分${remainingSeconds}秒`;
    if (minutes > 0) return `${minutes}分`;
    return `${remainingSeconds}秒`;
  }, []);

  /** スライドイン通知を表示 */
  const showNotification = useCallback(
    (message: string, level: NotificationLevel) => {
      setNotification({ show: true, message, level });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, show: false })),
        5000
      ); // 5秒後に非表示
    },
    []
  );

  /** 警告レベルに応じた通知メッセージを生成 */
  const getTimeLevelMessage = useCallback(
    (level: NotificationLevel, remaining: number): string => {
      const formatted = formatDetailedTime(remaining);
      switch (level) {
        case "notice":
          return `残り時間が50%を切りました。残り${formatted}`;
        case "warning":
          return `残り時間が25%を切りました。残り${formatted}`; // 25%
        case "critical":
          return remaining > 0
            ? `残り時間が10%を切りました！残り${formatted}`
            : "";
        default:
          return "";
      }
    },
    [formatDetailedTime]
  );

  // --- Effect フック ---

  /** タイマー処理 */
  useEffect(() => {
    // 初期時間が 0 以下ならタイマーを開始しない
    if (initialTotalTime <= 0) {
      setTimeRemaining(0);
      setIsTimerRunning(false);
      return;
    }

    // initialTotalTime が変更されたらタイマーをリセット
    setTimeRemaining(initialTotalTime);
    setIsTimerRunning(true); // タイマーを開始
    lastWarningLevelRef.current = "normal"; // 警告レベルもリセット
    timeUpNotifiedRef.current = false;

    // 1秒ごとに実行される関数
    const tick = () => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          // 時間切れ
          if (timerIdRef.current) clearInterval(timerIdRef.current); // タイマー停止
          console.log("Time's up via useTimer!");
          // ※ onTimeUp 内で二重処理しないための保険。通常はタイマー停止で十分。
          if (!timeUpNotifiedRef.current) {
            onTimeUp?.();
            timeUpNotifiedRef.current = true; // コールバック実行後にフラグを立てる
          }
          setIsTimerRunning(false); // タイマー停止状態にする
          return 0; // 残り時間を0に
        }
        return newTime; // 残り時間を更新
      });
    };

    // タイマースタート
    timerIdRef.current = setInterval(tick, 1000);

    // クリーンアップ関数: initialTotalTime が変わるかアンマウント時にタイマーを停止
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      setIsTimerRunning(false); // クリーンアップ時にも停止状態にする
    };
    // initialTotalTime または onTimeUp 関数が変わった時にタイマーを再設定
  }, [initialTotalTime, onTimeUp]);

  /** 通知処理 */
  useEffect(() => {
    // --- 修正: 時間切れ通知の条件を変更 ---
    // 時間切れになっていて、かつ、まだ時間切れ通知をしていない場合
    if (timeRemaining <= 0 && !timeUpNotifiedRef.current && isTimerRunning) {
      // isTimerRunning を追加（タイマー終了直後のみ）
      showNotification("時間切れです！解答を提出します。", "critical");
      timeUpNotifiedRef.current = true; // 通知したらフラグを立てる
      lastWarningLevelRef.current = "critical"; // 最終レベルは critical
      return; // 他の通知は不要
    }

    // タイマー動作中ではない、または時間切れの場合は以降のレベル通知はしない
    if (!isTimerRunning || timeRemaining <= 0) return;

    const currentLevel = getWarningLevel(timeRemaining);

    // 通常の警告レベル変化通知 (critical-timeout との比較は不要に)
    if (
      currentLevel !== lastWarningLevelRef.current &&
      currentLevel !== "normal"
    ) {
      const message = getTimeLevelMessage(currentLevel, timeRemaining);
      if (message) {
        showNotification(message, currentLevel);
        lastWarningLevelRef.current = currentLevel;
      }
    } else if (
      lastWarningLevelRef.current === "normal" &&
      currentLevel !== "normal"
    ) {
      lastWarningLevelRef.current = currentLevel;
    }
    // 依存配列から critical-timeout に関連するものを削除
  }, [
    timeRemaining,
    isTimerRunning,
    getWarningLevel,
    getTimeLevelMessage,
    showNotification,
  ]);

  // --- フックが返す値 ---
  const currentWarningLevel = getWarningLevel(timeRemaining);
  const timerColorClass = getTimerColor(currentWarningLevel);
  const formattedTime = formatTime(timeRemaining);

  return {
    timeRemaining,
    warningLevel: currentWarningLevel,
    timerColorClass,
    formattedTime,
    notification,
    isTimerRunning, // タイマー動作状態を追加
  };
};
