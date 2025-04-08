import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ProblemSelectionScreen from "./pages/ProblemSelectionScreen";
import AnswerInputScreen from "./pages/AnswerInputScreen";
import AnswerResultDashboard from "./pages/AnswerResultDashboard";
import "./index.css";

// createBrowserRouterを使用してルートを定義
const router = createBrowserRouter([
  {
    path: "/",
    element: <ProblemSelectionScreen />,
  },
  {
    path: "/quiz",
    element: <AnswerInputScreen />,
  },
  {
    path: "/result",
    element: <AnswerResultDashboard />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
