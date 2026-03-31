import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startExam } from "../api/examApi";

export default function StartExamPage() {
  const [examCode, setExamCode] = useState("az-900");
  const navigate = useNavigate();

  const handleStart = async () => {
    const res = await startExam(examCode, "11111111-1111-1111-1111-111111111111");
    navigate(`/exam/${res.data.id}`);
  };

  return (
    <div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif]">
      <div className="max-w-[1140px] mx-auto px-6 py-7">
        <h1 className="text-[24px] font-semibold mb-3">Microsoft Exam Simulator</h1>

        <div className="bg-white border border-[#c9c9c9] rounded-[3px] p-6 md:p-8 max-w-[640px]">
          <div className="mb-6">
            <div className="text-[13px] font-semibold tracking-[0.06em] text-[#2d4e73] uppercase">
              Exam Setup
            </div>
            <div className="text-[14px] text-[#4a4a4a] mt-1">
              Enter the exam code to start a new session.
            </div>
          </div>

          <label className="block text-[14px] text-[#4a4a4a] mb-2" htmlFor="examCode">
            Exam code
          </label>

          <input
            id="examCode"
            className="w-full h-9 border border-[#7b7b7b] px-3 text-[15px] bg-white"
            value={examCode}
            onChange={(e) => setExamCode(e.target.value)}
          />

          <div className="mt-5">
            <button
              onClick={handleStart}
              className="h-9 px-5 bg-[#2d4e73] text-white border border-[#294568] text-[14px] font-semibold cursor-pointer transition-colors hover:bg-[#234162]"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}