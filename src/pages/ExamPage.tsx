import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import type { Question, ResumeExamResponse } from "../types/exam";
import { resumeExam, submitExam } from "../api/examApi";
import QuestionCard from "../components/QuestionCard";

export default function ExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [data, setData] = useState<ResumeExamResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [timesUpModalOpen, setTimesUpModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  // Load exam
  useEffect(() => {
    if (!sessionId) return;
      
    resumeExam(sessionId).then((res) => {
      setData(res.data);

      const flatQuestions = res.data.sections.flatMap((s) => s.questions).map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        optionMap: q.optionMap,
        userAnswer: q.answer ?? q.userAnswer,
        isAnswered: q.answered ?? q.isAnswered ?? false,
        isFlagged: q.flagged ?? q.isFlagged ?? false,
        isVisited: q.visited ?? q.isVisited ?? false,
      }));
      setQuestions(flatQuestions);
      setTimeLeft(res.data.timer.remainingSeconds);

      const qParam = searchParams.get("q");
      if (qParam !== null) {
        const idx = parseInt(qParam, 10);
        if (!isNaN(idx) && idx >= 0 && idx < flatQuestions.length) {
          setCurrentIndex(idx);
        }
      }
    });
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (!timeLeft) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimesUpModalOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // Format timer
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
  }

  const isEmptyAnswer = (answer: any): boolean => {
    if (answer === null || answer === undefined) return true;
    if (typeof answer === "string") return answer.trim() === "";
    if (Array.isArray(answer)) {
      return answer.filter((item) => {
        if (typeof item === "string") return item.trim() !== "";
        return item !== null && item !== undefined;
      }).length === 0;
    }
    if (typeof answer === "object") return Object.keys(answer).length === 0;
    return false;
  };

  // State sync
  const handleAnswerChange = (id: string, answer: any) => {
    setQuestions((prev) => 
      prev.map((q) =>
        q.id === id
          ? { 
              ...q, 
              userAnswer: answer, 
              isAnswered: !isEmptyAnswer(answer)
          }
          : q
      )
    );
  };

  const handleFlagChange = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, isFlagged: !q.isFlagged }
          : q
      )
    );
  };

  const openSubmitModal = () => {
    if (!sessionId || submitting) return;

    const unanswered = questions.filter((q) => !q.isAnswered).length;
    const message = unanswered > 0
      ? `You still have ${unanswered} unanswered question(s). End exam anyway?`
      : "Are you sure you want to end the exam?";

    setConfirmMessage(message);
    setConfirmModalOpen(true);
  };

  const handleSubmitConfirm = async () => {
    if (!sessionId || submitting) return;

    setConfirmModalOpen(false);
    setSubmitting(true);
    try {
      await submitExam(sessionId);
      navigate(`/result/${sessionId}`);
    } catch {
      setErrorModalOpen(true);
      setSubmitting(false);
    }
  };

  // Derived
  const currentQuestion = questions[currentIndex];

  // Progress
  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => q.isAnswered).length;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const getQuestionButtonClass = (index: number, q: Question) => {
    const base = "h-[34px] w-[34px] text-[14px] border flex items-center justify-center transition-colors leading-none";

    if (index === currentIndex) {
      return `${base} bg-[#0078d4] text-white border-[#0078d4]`;
    }

    if (q.isAnswered) {
      return `${base} bg-[#00c853] text-white border-[#00c853]`;
    }

    return `${base} bg-white text-[#1f1f1f] border-[#7a7a7a]`;
  };

  if (!data || !questions.length) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif]">

      {/* LEFT PALETTE */}
      <div className="w-[232px] bg-white border-r border-[#c9c9c9] flex flex-col">

        {/* EXAM META */}
        <div className="px-3 py-3 border-b border-[#d8d8d8]">
          <div className="text-[13px] font-semibold tracking-[0.06em] text-[#2d4e73] uppercase">
            {data.examCode}
          </div>
          <div className="text-[13px] text-[#2f2f2f] leading-5 mt-1">
            {data.description}
          </div>
        </div>

        {/* PROGRESS */}
        <div className="px-3 py-4 border-b border-[#d8d8d8]">
          <div className="text-[18px] font-semibold mb-3 leading-tight">
            {answeredCount} of {totalQuestions} answered
          </div>

          <div className="w-full bg-[#d7d7d7] h-[7px] rounded">
            <div
              className="bg-[#0078d4] h-[7px] rounded"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* QUESTION GRID */}
        <div className="px-4 py-3 grid grid-cols-4 gap-2 overflow-auto content-start border-b border-[#d8d8d8]">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(index)}
              className={`${getQuestionButtonClass(index, q)} ${q.isFlagged ? "ring-2 ring-[#f2c200] ring-inset" : ""} cursor-pointer`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* LEGEND */}
        <div className="p-4 text-[12px] space-y-2 text-[#2b2b2b]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-[11px] h-[11px] bg-[#ececec] border border-[#b9b9b9]" />
            Not answered
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-[11px] h-[11px] bg-[#00c853]" />
            Answered
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-[11px] h-[11px] border border-[#f2c200]" />
            Marked for review
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}
        <div className="flex justify-between items-start px-5 py-3 bg-white border-b border-[#c9c9c9]">
          <div className="text-[34px] font-semibold leading-none pt-1">
            Question {currentIndex + 1}
          </div>

          <div className="text-right leading-none">
            <div className="text-[12px] tracking-[0.08em] text-[#4f6279] mb-1">TIME REMAINING</div>
            <div className="text-[32px] text-[#2d4e73] tabular-nums">{formatTime(timeLeft)}</div>
          </div>
        </div>

        {/* QUESTION */}
        <div className="flex-1 px-5 pt-4 pb-5 overflow-auto">
          <div className="w-full bg-white border border-[#b3b3b3] px-6 py-5 mt-1">
            {currentQuestion && (
              <QuestionCard 
                key={currentQuestion.id}
                question={currentQuestion}
                sessionId={data.sessionId}
                onAnswer={handleAnswerChange}
                onFlag={handleFlagChange}
              />
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center px-4 py-2 bg-white border-t border-[#c9c9c9]">
          <div className="flex gap-[6px]">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="min-w-[144px] h-[34px] px-4 bg-[#2d4e73] text-white border border-[#294568] disabled:opacity-45 cursor-pointer text-[14px] font-semibold leading-none transition-colors hover:bg-[#234162]"
            >
              &lt; Previous
            </button>

            <button
              disabled={currentIndex === totalQuestions - 1}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="min-w-[144px] h-[34px] px-4 bg-[#2d4e73] text-white border border-[#294568] disabled:opacity-45 cursor-pointer text-[14px] font-semibold leading-none transition-colors hover:bg-[#234162]"
            >
              Next &gt;
            </button>
          </div>

          <div className="flex gap-[6px]">
            <button
              onClick={() => navigate(`/exam/${sessionId}/review`)}
              className="min-w-[92px] h-[34px] px-4 bg-white text-[#1f1f1f] border border-[#6f6f6f] cursor-pointer text-[14px] leading-none transition-colors hover:bg-[#f6f6f6]"
            >
              Review
            </button>

            <button
              onClick={openSubmitModal}
              disabled={submitting}
              className="flex items-center gap-2 h-[34px] px-5 bg-[#2d4e73] text-white border border-[#294568] cursor-pointer text-[14px] font-semibold leading-none disabled:opacity-55 transition-colors hover:bg-[#234162]"
            >
              End Exam
              <span className="text-[16px] leading-none">→</span>
            </button>
          </div>

        </div>
      </div>

      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-[460px] bg-white border border-[#c9c9c9] shadow-lg">
            <div className="px-5 py-4 border-b border-[#d7d7d7] text-[18px] font-semibold text-[#1f1f1f]">
              Confirm End Exam
            </div>
            <div className="px-5 py-5 text-[14px] text-[#333] leading-6">
              {confirmMessage}
            </div>
            <div className="px-5 py-4 border-t border-[#d7d7d7] flex justify-end gap-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="h-[34px] px-4 bg-white text-[#1f1f1f] border border-[#8a8a8a] text-[14px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitConfirm}
                className="h-[34px] px-4 bg-[#2d4e73] text-white border border-[#294568] text-[14px] font-semibold"
              >
                End Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white border border-[#c9c9c9] shadow-lg">
            <div className="px-5 py-4 border-b border-[#d7d7d7] text-[18px] font-semibold text-[#7a2226]">
              Submission Failed
            </div>
            <div className="px-5 py-5 text-[14px] text-[#333] leading-6">
              Failed to submit exam. Please try again.
            </div>
            <div className="px-5 py-4 border-t border-[#d7d7d7] flex justify-end">
              <button
                onClick={() => setErrorModalOpen(false)}
                className="h-[34px] px-4 bg-[#2d4e73] text-white border border-[#294568] text-[14px] font-semibold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {timesUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white border border-[#c9c9c9] shadow-lg">
            <div className="px-5 py-4 border-b border-[#d7d7d7] text-[18px] font-semibold text-[#1f1f1f]">
              Time Expired
            </div>
            <div className="px-5 py-5 text-[14px] text-[#333] leading-6">
              Time is up. Please end the exam to see your result.
            </div>
            <div className="px-5 py-4 border-t border-[#d7d7d7] flex justify-end">
              <button
                onClick={() => setTimesUpModalOpen(false)}
                className="h-[34px] px-4 bg-[#2d4e73] text-white border border-[#294568] text-[14px] font-semibold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}