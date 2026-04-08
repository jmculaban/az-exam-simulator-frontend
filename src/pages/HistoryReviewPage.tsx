import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExamReview } from "../api/examApi";
import type { ReviewExamResponse, ReviewQuestion, UserAnswer } from "../types/exam";

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatAnswer(answer: UserAnswer | undefined, question: ReviewQuestion): string {
  if (answer === undefined || answer === null) {
    return "Not answered";
  }

  if (typeof answer === "string") {
    return question.optionMap?.[answer] ?? answer;
  }

  if (Array.isArray(answer)) {
    if (answer.length === 0) return "Not answered";
    return answer.map((item) => question.optionMap?.[item] ?? item).join(", ");
  }

  const entries = Object.entries(answer);
  if (entries.length === 0) return "Not answered";

  return entries
    .map(([left, right]) => `${question.optionMap?.[left] ?? left} -> ${question.optionMap?.[right] ?? right}`)
    .join(" | ");
}

export default function HistoryReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ReviewExamResponse | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Session ID is missing.");
      return;
    }

    getExamReview(sessionId)
      .then((res) => {
        setData(res.data);
        setOpenSections(
          Object.fromEntries(res.data.sections.map((section) => [section.id, false]))
        );
      })
      .catch(() => setError("Unable to load review details."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? false),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif] flex items-center justify-center">
        Loading exam review...
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif] px-4 py-6">
        <div className="max-w-[1000px] mx-auto bg-white border border-[#c9c9c9] p-6">
          <div className="text-[16px] text-[#8b2631]">{error || "Unable to load review."}</div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 h-9 px-5 bg-white text-[#1f1f1f] border border-[#7b7b7b] text-[14px] font-semibold"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif] px-4 py-6">
      <div className="max-w-[1140px] mx-auto">
        <h1 className="text-[24px] font-semibold mb-3">Exam Answer Review</h1>

        <div className="bg-white border border-[#c9c9c9] p-4 mb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-[14px]">
          <div>
            <div className="text-[#4a4a4a]">User ID</div>
            <div className="font-semibold break-all">{data.userId || "-"}</div>
          </div>
          <div>
            <div className="text-[#4a4a4a]">Start Date</div>
            <div className="font-semibold break-words">{formatDateTime(data.startTime)}</div>
          </div>
          <div>
            <div className="text-[#4a4a4a]">End Date</div>
            <div className="font-semibold break-words">{formatDateTime(data.endTime)}</div>
          </div>
          <div>
            <div className="text-[#4a4a4a]">Score</div>
            <div className="font-semibold">{Math.round(data.score)}</div>
          </div>
          <div>
            <div className="text-[#4a4a4a]">Correct</div>
            <div className="font-semibold">
              {data.correct} / {data.total}
            </div>
          </div>
          <div>
            <div className="text-[#4a4a4a]">Result</div>
            <div className={`font-semibold ${data.passed ? "text-[#1d5a20]" : "text-[#8b2631]"}`}>
              {data.passed ? "Passed" : "Failed"}
            </div>
          </div>
        </div>

        {data.sections.map((section) => (
          <div key={section.id} className="bg-white border border-[#c9c9c9] mb-5">
            {(() => {
              const isOpen = openSections[section.id] ?? false;

              return (
                <>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 border-b border-[#d8d8d8] bg-[#f7f7f7] flex items-center justify-between gap-4 text-left"
            >
              <div>
                <h2 className="text-[18px] font-semibold">{section.title}</h2>
                <div className="text-[12px] text-[#5a5a5a] mt-1">
                  {section.questions.length} questions
                </div>
              </div>
              <span className="text-[18px] font-semibold text-[#2d4e73]">
                {isOpen ? "-" : "+"}
              </span>
            </button>

            {isOpen && (
            <div className="divide-y divide-[#ececec]">
              {section.questions.map((question, index) => (
                <div key={question.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[15px] font-semibold text-[#1f1f1f] leading-6">
                      {index + 1}. {question.text}
                    </div>
                    <span
                      className={`inline-block px-2 py-[2px] text-[12px] font-semibold border whitespace-nowrap ${
                        question.isCorrect
                          ? "bg-[#e8f3e8] text-[#1d5a20] border-[#b6d2b8]"
                          : "bg-[#fbeaec] text-[#8b2631] border-[#e2b0b6]"
                      }`}
                    >
                      {question.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[14px]">
                    <div className="border border-[#dcdcdc] bg-[#fafafa] p-3">
                      <div className="text-[#4a4a4a] text-[12px] uppercase tracking-[0.06em] mb-1">
                        Your Answer
                      </div>
                      <div className="text-[#1f1f1f] break-words">
                        {formatAnswer(question.userAnswer, question)}
                      </div>
                    </div>

                    <div className="border border-[#d7e3d7] bg-[#f5faf5] p-3">
                      <div className="text-[#3c5c3f] text-[12px] uppercase tracking-[0.06em] mb-1">
                        Correct Answer
                      </div>
                      <div className="text-[#1f1f1f] break-words">
                        {formatAnswer(question.correctAnswer, question)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
                </>
              );
            })()}
          </div>
        ))}

        <button
          onClick={() => navigate(-1)}
          className="h-9 px-5 bg-[#2d4e73] text-white border border-[#294568] text-[14px] font-semibold hover:bg-[#234162]"
        >
          Back
        </button>
      </div>
    </div>
  );
}
