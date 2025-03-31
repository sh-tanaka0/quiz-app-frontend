import { useState } from "react";
import { useNavigate } from "react-router-dom"; // useNavigateをインポート
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
import { Book, BookOpen } from "lucide-react";

const ProblemSelectionScreen = () => {
  const [bookSource, setBookSource] = useState("readableCode");
  const [problemCount, setProblemCount] = useState(10);
  // timeLimitを1問あたりの時間(秒)として扱う
  const [timeLimit, settimeLimit] = useState(60);
  const navigate = useNavigate(); // useNavigateフックを使用

  const handleStartQuiz = () => {
    console.log("Starting quiz with settings:", {
      bookSource,
      problemCount,
      timeLimit,
    });
    // /quiz ルートに遷移し、選択した設定を state で渡す
    navigate("/quiz", {
      state: {
        quizSettings: {
          bookSource,
          problemCount,
          timeLimit,
        },
      },
    });
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">問題選択</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Book Source Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">出題範囲選択</h2>
            <RadioGroup
              value={bookSource}
              onValueChange={setBookSource}
              className="grid grid-cols-3 gap-4"
            >
              {[
                {
                  value: "readableCode",
                  label: "リーダブルコード",
                  icon: <Book className="mb-2" size={32} />,
                },
                {
                  value: "principles",
                  label: "プリンシプルオブプログラミング",
                  icon: <BookOpen className="mb-2" size={32} />,
                },
                {
                  value: "both",
                  label: "両方",
                  icon: (
                    <div className="flex">
                      <Book className="mb-2 mr-1" size={24} />
                      <BookOpen className="mb-2" size={24} />
                    </div>
                  ),
                },
              ].map(({ value, label, icon }) => (
                <div key={value} className="w-full">
                  <RadioGroupItem
                    value={value}
                    id={value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={value}
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 h-full w-full text-center
                      hover:bg-blue-50 hover:border-blue-300
                      ${
                        bookSource === value
                          ? "border-blue-500 bg-blue-100 text-blue-800"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                  >
                    <div className="flex flex-col items-center">
                      {icon}
                      <span className="mt-2 font-medium">{label}</span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Problem Count Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">問題数選択</h2>
            <Select
              value={problemCount.toString()}
              onValueChange={(value) => setProblemCount(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="問題数を選択" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 25, 30].map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    {count}問
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Limit Selection (1問あたり) */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">1問あたりの時間</h2>
            <Select
              value={timeLimit.toString()}
              onValueChange={(value) => settimeLimit(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="1問あたりの時間" />
              </SelectTrigger>
              <SelectContent>
                {[30, 45, 60, 75, 90].map((seconds) => (
                  <SelectItem key={seconds} value={seconds.toString()}>
                    {seconds}秒
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Button */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleStartQuiz}
          >
            開始
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProblemSelectionScreen;
