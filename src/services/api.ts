import axios from "axios";
import {
  AnswerPayload,
  QuestionsApiResponse,
  AnswersApiResponse,
} from "@/types/quiz"; // パスを調整

// Axiosインスタンスを作成 (ベースURLなどを設定すると便利)
const apiClient = axios.create({
  baseURL: "http://localhost:8000", // APIのベースパス (環境変数などから取得推奨)
  timeout: 10000, // タイムアウト設定 (10秒)
});

/**
 * 問題セットを取得する関数
 * @param bookSource 出題範囲
 * @param count 問題数
 * @param timeLimit 1問あたりの制限時間
 * @returns セッションIDと問題リストを含むオブジェクト
 */
export const fetchQuizQuestions = async (
  bookSource: string,
  count: number,
  timeLimit: number
): Promise<QuestionsApiResponse> => {
  try {
    const response = await apiClient.get<QuestionsApiResponse>("/questions", {
      params: { bookSource, count, timeLimit },
      // TODO:APIキーなどのヘッダーを追加
      // headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return { ...response.data };
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    // エラーの種類に応じて適切なエラーメッセージを投げる
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "問題の取得に失敗しました。"
      );
    }
    throw new Error("問題の取得中に不明なエラーが発生しました。");
  }
};

/**
 * 解答を提出して結果を取得する関数
 * @param payload セッションIDと解答リスト
 * @returns 解答結果リストを含むオブジェクト
 */
export const submitQuizAnswers = async (
  payload: AnswerPayload
): Promise<AnswersApiResponse> => {
  try {
    const response = await apiClient.post<AnswersApiResponse>(
      "/answers",
      payload,
      {
        // TODO:APIキーを追加
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error submitting quiz answers:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "解答の提出に失敗しました。"
      );
    }
    throw new Error("解答の提出中に不明なエラーが発生しました。");
  }
};
