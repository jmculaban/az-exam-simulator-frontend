import { BrowserRouter, Route, Routes } from "react-router-dom";
import StartExamPage from "./pages/StartExamPage";
import ExamPage from "./pages/ExamPage";
import ReviewPage from "./pages/ReviewPage";
import ResultPage from "./pages/ResultPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartExamPage />} />
        <Route path="/exam/:sessionId" element={<ExamPage />} />
        <Route path="/exam/:sessionId/review" element={<ReviewPage />} />
        <Route path="/result/:sessionId" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
