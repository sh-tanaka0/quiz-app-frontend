import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProblemSelectionScreen from "./pages/ProblemSelectionScreen";
import AnswerInputScreen from "./pages/AnswerInputScreen";
import AnswerResultDashboard from "./pages/AnswerResultDashboard";
import "./index.css"; // Tailwind CSS / shadcn/ui のスタイルシートをインポート

function App() {
  return (
    <Router>
      <Routes>
        {/* 問題選択画面 (ルートパス) */}
        <Route path="/" element={<ProblemSelectionScreen />} />

        {/* 解答画面 */}
        <Route path="/quiz" element={<AnswerInputScreen />} />

        {/* 結果表示画面 */}
        <Route path="/result" element={<AnswerResultDashboard />} />

        {/* 他のルートやNot Foundページなどもここに追加できます */}
      </Routes>
    </Router>
  );
}

export default App;
