import { useState } from "react";
import { useNavigate } from "react-router";
import { startExam } from "../api/examApi";

export default function StartExamPage() {
  const [examCode, setExamCode] = useState("az-900");
  const navigate = useNavigate();

  const handleStart = async () => {
    const res = await startExam(examCode, "11111111-1111-1111-1111-111111111111");
    navigate(`/exam/${res.data.id}`);
  };

  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-2xl mb-4">Start Exam</h1>

      <input
        className="border p-2"
        value={examCode}
        onChange={(e) => setExamCode(e.target.value)}
      />

      <button
        onClick={handleStart}
        className="mt-4 bg-blue-500 text-white px-4 py-2"
      >
        Start Exam
      </button>
    </div>
  );
}