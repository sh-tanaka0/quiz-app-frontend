import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Code,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import {
  DEFAULT_BOOK_SOURCE,
  DEFAULT_PROBLEM_COUNT,
  DEFAULT_TIME_LIMIT,
  PROBLEM_COUNT_OPTIONS,
  TIME_LIMIT_OPTIONS,
  BOOK_SOURCE_OPTIONS,
  RECENT_UPDATES,
  RECENT_PROBLEMS,
} from "@/constants/quizSettings";

const ProblemSelectionScreen = () => {
  const [bookSource, setBookSource] = useState(DEFAULT_BOOK_SOURCE);
  const [problemCount, setProblemCount] = useState(DEFAULT_PROBLEM_COUNT);
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const estimatedTime = Math.ceil((problemCount * timeLimit) / 60);

  const handleStartQuiz = () => {
    setIsLoading(true);
    const queryParams = new URLSearchParams({
      bookSource: bookSource,
      count: problemCount.toString(),
      timeLimit: timeLimit.toString(),
    }).toString();
    navigate(`/quiz?${queryParams}`);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Code className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">
              プログラミング基礎知識問題サイト
            </h1>
          </div>
          <p className="text-lg text-gray-600  mx-auto">
            プログラミングの基礎知識を学べるクイズアプリです。
            問題を選んで挑戦し、スコアを確認して知識を深めましょう！
          </p>
          {/* <div className="flex flex-wrap items-center justify-center mt-4 gap-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-1" />
              現在{" "}
              {BOOK_SOURCE_OPTIONS.reduce(
                (sum, option) => sum + option.problemCount,
                0
              )}{" "}
              問収録中
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              1,200+ ユーザーが利用中
            </div>
            <div className="flex items-center">
              <Moon className="w-4 h-4 mr-1" />
              ダークモード対応予定
            </div>
          </div> */}
        </div>

        {/* Main Quiz Configuration */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center">
              問題設定
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-4xl mx-auto">
            {/* 出題範囲選択 */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                出題範囲選択
              </h2>
              <RadioGroup
                value={bookSource}
                onValueChange={setBookSource}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                {BOOK_SOURCE_OPTIONS.map(
                  ({
                    value,
                    label,
                    icon,
                    description,
                    difficulty,
                    problemCount,
                  }) => (
                    <div key={value} className="w-full">
                      <RadioGroupItem
                        value={value}
                        id={value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={value}
                        className={`flex flex-col items-center text-center rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-md h-full
                        ${
                          bookSource === value
                            ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="mb-4">{icon}</div>
                        <div className="font-semibold text-lg mb-2">
                          {label}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {description}
                        </div>
                        <div className="mt-auto space-y-2">
                          <Badge variant="outline" className="text-xs">
                            {difficulty}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {problemCount}問収録
                          </div>
                        </div>
                      </Label>
                    </div>
                  )
                )}
              </RadioGroup>
            </div>

            {/* Settings and Recommendation Grid */}
            <div className="grid grid-cols-1  gap-6 mb-14">
              {/* Settings */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 問題数選択 */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      問題数選択
                    </h2>
                    <Select
                      value={problemCount.toString()}
                      onValueChange={(value) =>
                        setProblemCount(parseInt(value, 10))
                      }
                    >
                      <SelectTrigger className="w-full h-16 text-lg">
                        <SelectValue placeholder="問題数を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROBLEM_COUNT_OPTIONS.map((count) => (
                          <SelectItem key={count} value={count.toString()}>
                            {count}問
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 時間選択 */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      1問あたりの解答時間
                    </h2>
                    <Select
                      value={timeLimit.toString()}
                      onValueChange={(value) =>
                        setTimeLimit(parseInt(value, 10))
                      }
                    >
                      <SelectTrigger className="w-full h-16 text-lg">
                        <SelectValue placeholder="制限時間を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_LIMIT_OPTIONS.map((seconds) => (
                          <SelectItem key={seconds} value={seconds.toString()}>
                            {seconds}秒
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 blur-lg opacity-50 rounded-xl"></div>
              <Button
                className="relative w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xl font-bold py-8 px-8 shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-3xl rounded-xl"
                onClick={handleStartQuiz}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    <span className="text-lg">準備中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Zap className="w-7 h-7 mr-3" />
                    クイズを開始する
                    <span className="ml-2 text-sm font-normal opacity-80">
                      ({problemCount}問 / 約{estimatedTime}分)
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Content Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            インフォメーション
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Updates */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-green-600" />
                  更新情報
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {RECENT_UPDATES.map((update, index) => (
                    <div
                      key={index}
                      className="border-l-3 border-green-400 pl-4 py-2"
                    >
                      <div className="text-xs text-gray-500 font-medium">
                        {update.date}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {update.content}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Problems Preview */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="text-lg flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                  最近追加された問題
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {RECENT_PROBLEMS.map((problem, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-700 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <span className="text-blue-600 font-medium mr-2">•</span>
                      {problem}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                  統計情報（仮）
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">総問題数</span>
                    <Badge className="bg-purple-100 text-purple-700">
                      150問
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">今週の挑戦者</span>
                    <Badge className="bg-purple-100 text-purple-700">
                      今後追加予定
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">平均正答率</span>
                    <Badge className="bg-purple-100 text-purple-700">
                      今後追加予定
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemSelectionScreen;
