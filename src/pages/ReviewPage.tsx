import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { SectionReviewResponse, QuestionReviewItem } from "../types/exam";
import { getSectionReview, submitExam } from "../api/examApi";

type FilterType = "all" | "answered" | "unanswered" | "flagged";

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<SectionReviewResponse | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [timeLeft, setTimeLeft] = useState(0);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    getSectionReview(sessionId).then((res) => {
      setData(res.data);
      setTimeLeft(res.data.timer.remainingSeconds);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!timeLeft) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
  };

  const handleGoToQuestion = (globalIndex: number) => {
    navigate(`/exam/${sessionId}?q=${globalIndex}`);
  };

  const openSubmitModal = () => {
    if (!sessionId || submitting) return;
    const unanswered = allQuestions.filter((q) => !q.answered).length;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
      : "Are you sure you want to submit the exam?";
    setConfirmMessage(msg);
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#efefef] font-[Segoe_UI,Tahoma,sans-serif]">
        <div className="text-[15px] text-[#444]">Loading review...</div>
      </div>
    );
  }

  // Build a flat list with global index and section context
  const allQuestions: (QuestionReviewItem & { globalIndex: number; sectionTitle: string })[] = [];
  let idx = 0;
  for (const section of data.sections) {
    for (const q of section.questions) {
      allQuestions.push({ ...q, globalIndex: idx, sectionTitle: section.title });
      idx++;
    }
  }

  const answeredCount = allQuestions.filter((q) => q.answered).length;
  const unansweredCount = allQuestions.filter((q) => !q.answered).length;
  const flaggedCount = allQuestions.filter((q) => q.flagged).length;

  const filteredQuestions = allQuestions.filter((q) => {
    if (filter === "answered") return q.answered;
    if (filter === "unanswered") return !q.answered;
    if (filter === "flagged") return q.flagged;
    return true;
  });

  // Section progress for top bar (answered/total per section)
  const sectionProgress = data.sections.map((section) => {
    const total = section.questions.length;
    const answered = section.questions.filter((q) => q.answered).length;
    return { title: section.title, answered, total };
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#efefef] font-[Segoe_UI,Tahoma,sans-serif] text-[#1f1f1f]">

      {/* TOP BAR */}
      <div className="bg-white border-b border-[#c9c9c9] px-5 py-2 flex items-center justify-between">
        {/* Section progress */}
        <div className="flex items-center gap-6">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-[#444] uppercase mr-2">
            PROGRESS
          </span>
          {sectionProgress.map((sec) => (
            <div key={sec.title} className="flex flex-col items-center gap-[3px]">
              <div className="text-[11px] text-[#333] whitespace-nowrap">
                {sec.title} ({sec.answered}/{sec.total})
              </div>
              <div className="w-[120px] h-[6px] bg-[#d7d7d7] rounded">
                <div
                  className="h-[6px] bg-[#0078d4] rounded transition-all"
                  style={{ width: sec.total ? `${Math.round((sec.answered / sec.total) * 100)}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Timer */}
        <div className="text-right leading-none">
          <div className="text-[11px] tracking-[0.1em] text-[#4f6279] font-semibold mb-1 uppercase">
            TIME REMAINING
          </div>
          <div className="text-[28px] text-[#2d4e73] tabular-nums font-light">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-5">

        {/* Heading */}
        <h1 className="text-[26px] font-semibold mb-4 leading-tight">Review your answers</h1>

        {/* Instructions accordion */}
        <div className="border border-[#c9c9c9] bg-[#fefefe] mb-5">
          <button
            onClick={() => setInstructionsOpen((o) => !o)}
            className="w-full flex justify-between items-center px-4 py-3 text-[14px] font-semibold text-[#1f1f1f] cursor-pointer bg-[#f9f9f9] border-b border-[#d0d0d0]"
          >
            <span>Review Screen Instructions</span>
            <span className="text-[12px] font-normal text-[#555]">
              {instructionsOpen ? "Collapse ⌃" : "Expand ∨"}
            </span>
          </button>
          {instructionsOpen && (
            <div className="px-5 py-4 text-[13px] text-[#333] leading-6 space-y-2">
              <p>
                You can use this screen to review your answers before submitting the exam.
              </p>
              <p>
                Click on a question row to navigate back to that question and change your answer.
                Use the filter buttons to focus on unanswered or flagged questions.
              </p>
              <p>
                When you are satisfied with your answers, click <strong>End Exam</strong> to submit.
              </p>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[13px] font-semibold text-[#333]">Filter By:</span>
          {(
            [
              { key: "all", label: `All (${allQuestions.length})` },
              { key: "answered", label: `Answered (${answeredCount})` },
              { key: "unanswered", label: `Unanswered (${unansweredCount})` },
              { key: "flagged", label: `For Review (${flaggedCount})` },
            ] as { key: FilterType; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-[6px] cursor-pointer text-[13px]">
              <input
                type="radio"
                name="filter"
                value={key}
                checked={filter === key}
                onChange={() => setFilter(key)}
                className="accent-[#0078d4]"
              />
              {label}
            </label>
          ))}
        </div>

        {/* Question table */}
        <div className="border border-[#c9c9c9] bg-white">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_100px_120px_120px] border-b border-[#c9c9c9] bg-[#f3f3f3]">
            <div className="px-3 py-2 text-[12px] font-semibold text-[#444]">#</div>
            <div className="px-3 py-2 text-[12px] font-semibold text-[#444]">
              '{filter === "all" ? "All" : filter === "answered" ? "Answered" : filter === "unanswered" ? "Unanswered" : "For Review"}' Questions
            </div>
            <div className="px-3 py-2 text-[12px] font-semibold text-[#444] text-center">Answered</div>
            <div className="px-3 py-2 text-[12px] font-semibold text-[#444] text-center">Unanswered</div>
            <div className="px-3 py-2 text-[12px] font-semibold text-[#444] text-center">For Review</div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-[#666] text-center">
              No questions match the selected filter.
            </div>
          ) : (
            filteredQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => handleGoToQuestion(q.globalIndex)}
                className="w-full grid grid-cols-[40px_1fr_100px_120px_120px] border-b border-[#e8e8e8] text-left hover:bg-[#f0f6ff] transition-colors cursor-pointer"
              >
                <div className="px-3 py-3 text-[13px] text-[#0078d4] font-semibold self-start">
                  {q.globalIndex + 1}
                </div>
                <div className="px-3 py-3 text-[13px] text-[#0078d4] leading-5 line-clamp-3">
                  {q.text}
                </div>
                <div className="px-3 py-3 flex items-center justify-center">
                  {q.answered && <span className="text-[16px] text-[#1f1f1f]">✓</span>}
                </div>
                <div className="px-3 py-3 flex items-center justify-center">
                  {!q.answered && <span className="text-[16px] text-[#1f1f1f]">✓</span>}
                </div>
                <div className="px-3 py-3 flex items-center justify-center">
                  {q.flagged && <span className="text-[16px] text-[#1f1f1f]">✓</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-white border-t border-[#c9c9c9] px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(`/exam/${sessionId}`)}
          className="min-w-[144px] h-[34px] px-4 bg-[#2d4e73] text-white border border-[#294568] cursor-pointer text-[14px] font-semibold leading-none transition-colors hover:bg-[#234162]"
        >
          &lt; Back to Exam
        </button>

        <button
          onClick={openSubmitModal}
          disabled={submitting}
          className="flex items-center gap-2 h-[34px] px-5 bg-[#2d4e73] text-white border border-[#294568] cursor-pointer text-[14px] font-semibold leading-none disabled:opacity-50 transition-colors hover:bg-[#234162]"
        >
          End Exam
          <span className="text-[16px] leading-none">→</span>
        </button>
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
    </div>
  );
}
