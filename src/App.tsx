import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import StartExamPage from "./pages/StartExamPage";
import ExamPage from "./pages/ExamPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartExamPage />} />
        <Route path="/exam/:sessionId" element={<ExamPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
