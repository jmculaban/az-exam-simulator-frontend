import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureUser, startExam } from "../api/examApi";

export default function StartExamPage() {
  const USER_ID_KEY = "mpa_user_id";
  const [examCode, setExamCode] = useState("az-900");
  const [userId, setUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const existing = localStorage.getItem(USER_ID_KEY);
    if (existing) {
      setUserId(existing);
    }
  }, []);

  const handleStart = async () => {
    setErrorMessage("");

    const resolvedUserId = userId.trim();

    if (!resolvedUserId) {
      setErrorMessage("User ID is required.");
      return;
    }

    localStorage.setItem(USER_ID_KEY, resolvedUserId);

    await ensureUser({
      id: resolvedUserId,
      email: `user-${resolvedUserId}@local.simulator`,
    });

    const res = await startExam(examCode, resolvedUserId);
    navigate(`/exam/${res.data.id}`);
  };

  const handleReviewPrevious = () => {
    setErrorMessage("");
    const resolvedUserId = userId.trim();

    if (!resolvedUserId) {
      setErrorMessage("User ID is required.");
      return;
    }

    localStorage.setItem(USER_ID_KEY, resolvedUserId);
    navigate(`/history/${resolvedUserId}`);
  };

  return (
    <div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[1140px] flex-1 flex items-center">
        <div className="w-full max-w-[640px] mx-auto">
          <h1 className="text-[24px] font-semibold mb-3">Microsoft Practice Assessment</h1>

          <div className="bg-white border border-[#c9c9c9] rounded-[3px] p-6 md:p-8">
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

            <label className="block text-[14px] text-[#4a4a4a] mb-2 mt-4" htmlFor="userId">
              User ID
            </label>

            <input
              id="userId"
              className="w-full h-9 border border-[#7b7b7b] px-3 text-[15px] bg-white"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />

            {errorMessage && (
              <div className="mt-2 text-[13px] text-[#b4232f]">
                {errorMessage}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleStart}
                className="h-9 px-5 bg-[#2d4e73] text-white border border-[#294568] text-[14px] font-semibold cursor-pointer transition-colors hover:bg-[#234162]"
              >
                Start Exam
              </button>

              <button
                onClick={handleReviewPrevious}
                className="h-9 px-5 bg-white text-[#2d4e73] border border-[#2d4e73] text-[14px] font-semibold cursor-pointer transition-colors hover:bg-[#f1f5fa]"
              >
                Review Previous Exams
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full py-4 text-center text-[12px] text-[#666] mt-8">
        <p>© JM Culaban</p>
      </footer>
    </div>
  );
}