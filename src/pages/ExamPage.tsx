import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate, useSearchParams } from "react-router-dom";
import type { Question, ResumeExamResponse, SectionReviewResponse } from "../types/exam";
import { getResult, resumeExam, submitExam } from "../api/examApi";
import QuestionCard from "../components/QuestionCard";

type ExamPageLocationState = {
  examSnapshot?: {
    data: ResumeExamResponse;
    questions: Question[];
    currentIndex: number;
    timeLeft: number;
  };
};

function buildReviewSnapshot(
  data: ResumeExamResponse,
  questions: Question[],
  timeLeft: number,
): SectionReviewResponse {
  let questionIndex = 0;

  const sections = data.sections.map((section) => {
    const nextQuestions = section.questions.map((question) => {
      const currentQuestion = questions[questionIndex] ?? question;
      questionIndex += 1;

      return {
        id: currentQuestion.id,
        text: currentQuestion.text,
        answered: currentQuestion.isAnswered,
        flagged: currentQuestion.isFlagged,
      };
    });

    return {
      id: section.id,
      title: section.title,
      questions: nextQuestions,
    };
  });

  const answered = questions.filter((question) => question.isAnswered).length;
  const flagged = questions.filter((question) => question.isFlagged).length;

  return {
    sessionId: data.sessionId,
    examCode: data.examCode,
    description: data.description,
    timer: {
      remainingSeconds: timeLeft,
      expired: timeLeft <= 0,
    },
    navigation: {
      total: questions.length,
      answered,
      flagged,
      notVisited: questions.filter((question) => !question.isVisited).length,
    },
    sections,
  };
}

export default function ExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = location.state as ExamPageLocationState | null;
  
  const [data, setData] = useState<ResumeExamResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);
  const [autoSubmitError, setAutoSubmitError] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [isAnswerSaving, setIsAnswerSaving] = useState(false);
  const isAnswerSavingRef = useRef(false);

  // Load exam
  useEffect(() => {
    if (!sessionId) return;

    const snapshot = locationState?.examSnapshot;
    if (snapshot && snapshot.data.sessionId === sessionId) {
      setData(snapshot.data);
      setQuestions(snapshot.questions);
      setTimeLeft(snapshot.timeLeft);

      const qParam = searchParams.get("q");
      if (qParam !== null) {
        const idx = parseInt(qParam, 10);
        if (!isNaN(idx) && idx >= 0 && idx < snapshot.questions.length) {
          setCurrentIndex(idx);
          return;
        }
      }

      setCurrentIndex(snapshot.currentIndex);
      return;
    }
      
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
  }, [locationState, searchParams, sessionId]);

  // Timer countdown
  useEffect(() => {
    if (!timeLeft) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAutoSubmitPending(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // When timer expires, backend auto-submit runs in the background.
  // Poll result endpoint and redirect as soon as result is ready.
  useEffect(() => {
    if (!autoSubmitPending || !sessionId) return;

    let cancelled = false;

    const checkResult = async () => {
      try {
        await getResult(sessionId);
        if (!cancelled) {
          navigate(`/result/${sessionId}`);
        }
      } catch {
        // Result not ready yet; keep polling.
      }
    };

    checkResult();
    const interval = setInterval(checkResult, 3000);
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setAutoSubmitError(true);
      }
    }, 90000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [autoSubmitPending, navigate, sessionId]);

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
    if (!sessionId || submitting || autoSubmitPending) return;

    const unanswered = questions.filter((q) => !q.isAnswered).length;
    const message = unanswered > 0
      ? `You still have ${unanswered} unanswered question(s). End exam anyway?`
      : "Are you sure you want to end the exam?";

    setConfirmMessage(message);
    setConfirmModalOpen(true);
  };

  const handleSubmitConfirm = async () => {
    if (!sessionId || submitting || isAnswerSavingRef.current) return;

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

  const handleAnswerSavingChange = (saving: boolean) => {
    isAnswerSavingRef.current = saving;
    setIsAnswerSaving(saving);
  };

  const handleReviewNavigation = () => {
    if (!sessionId || isAnswerSavingRef.current || !data) {
      return;
    }

    navigate(`/exam/${sessionId}/review`, {
      state: {
        reviewSnapshot: buildReviewSnapshot(data, questions, timeLeft),
        examSnapshot: {
          data,
          questions,
          currentIndex,
          timeLeft,
        },
      },
    });
  };

  // Progress
  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => q.isAnswered).length;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const getQuestionButtonClass = (index: number, q: Question) => {
    const base = "relative h-[34px] w-[34px] rounded-[6px] text-[13px] border flex items-center justify-center transition-colors leading-none font-semibold";

    if (index === currentIndex) {
      return `${base} bg-[#2d4e73] text-white border-[#2d4e73] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]`;
    }

    if (q.isAnswered) {
      return `${base} bg-[#eaf6ee] text-[#1f6a36] border-[#b9ddc4] hover:bg-[#e1f1e7]`;
    }

    return `${base} bg-[#f8f8f9] text-[#2b2b2b] border-[#cdced2] hover:bg-[#f0f1f3]`;
  };

  if (!data || !questions.length) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif]">

      {/* LEFT PALETTE */}
      <div className="w-[232px] bg-white border-r border-[#c9c9c9] flex flex-col">

        {/* EXAM META */}
        <div className="h-[96px] px-3 border-b border-[#d8d8d8] flex flex-col justify-center">
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
        <div className="px-3 py-3 border-b border-[#d8d8d8]">
          <div className="rounded-[8px] border border-[#dde0e5] bg-[#f7f8fa] p-3">
            <div className="grid grid-cols-4 gap-2 max-h-[420px] overflow-auto content-start pr-1">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`${getQuestionButtonClass(index, q)} cursor-pointer`}
                >
                  {index + 1}
                  {q.isFlagged && (
                    <span className="absolute -top-[3px] -right-[3px] h-[9px] w-[9px] rounded-full bg-[#f2c200] border border-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div className="p-4 text-[12px] space-y-2 text-[#2b2b2b]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-[11px] h-[11px] rounded-[2px] bg-[#f8f8f9] border border-[#cdced2]" />
            Not answered
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-[11px] h-[11px] rounded-[2px] bg-[#eaf6ee] border border-[#b9ddc4]" />
            Answered
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-[11px] h-[11px] rounded-full bg-[#f2c200]" />
            Marked for review
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}
        <div className="h-[96px] flex justify-between items-center px-5 bg-white border-b border-[#c9c9c9]">
          <div className="text-[24px] font-semibold leading-none">
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
                onSavingChange={handleAnswerSavingChange}
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
              onClick={handleReviewNavigation}
              disabled={isAnswerSaving}
              className="min-w-[92px] h-[34px] px-4 bg-white text-[#1f1f1f] border border-[#6f6f6f] disabled:opacity-50 cursor-pointer text-[14px] leading-none transition-colors hover:bg-[#f6f6f6]"
            >
              {isAnswerSaving ? "Saving..." : "Review"}
            </button>

            <button
              onClick={openSubmitModal}
              disabled={submitting || autoSubmitPending || isAnswerSaving}
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

      {autoSubmitPending && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-[460px] bg-white border border-[#c9c9c9] shadow-lg">
            <div className="px-5 py-4 border-b border-[#d7d7d7] text-[18px] font-semibold text-[#1f1f1f]">
              Time Expired
            </div>
            <div className="px-5 py-5 text-[14px] text-[#333] leading-6">
              {autoSubmitError
                ? "Result is taking longer than expected. Auto-submit may still be processing."
                : "Time is up. Submitting your exam automatically. Please wait..."}
            </div>
            <div className="px-5 py-4 border-t border-[#d7d7d7] flex justify-end gap-2">
              {autoSubmitError && (
                <button
                  onClick={async () => {
                    if (!sessionId) return;
                    try {
                      await getResult(sessionId);
                      navigate(`/result/${sessionId}`);
                    } catch {
                      // still not ready
                    }
                  }}
                  className="h-[34px] px-4 bg-[#2d4e73] text-white border border-[#294568] text-[14px] font-semibold"
                >
                  Check Result Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}