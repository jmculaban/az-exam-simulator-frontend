import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Question, ResumeExamResponse } from "../types/exam";
import { resumeExam } from "../api/examApi";
import QuestionCard from "../components/QuestionCard";

export default function ExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  
  const [data, setData] = useState<ResumeExamResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Progress
  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => q.isAnswered).length;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Load exam
  useEffect(() => {
    if (!sessionId) return;
      
    resumeExam(sessionId).then((res) => {
      setData(res.data);

      const flatQuestions = res.data.sections.flatMap((s) => s.questions);
      
      setQuestions(flatQuestions);
      setTimeLeft(res.data.timer.remainingSeconds);
    });
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (!timeLeft) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          alert("Time's up!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  // Derived
  const currentQuestion = questions[currentIndex];

  if (!data || !questions.length) {
    return <div className="p-6">Loading...</div>;
  }

  // Format timer
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${m}:${s.toString().padStart(2, "0")}`;
  }

  const isEmptyAnswer = (answer: any): boolean => {
    if (answer === null || answer === undefined) return true;
    if (typeof answer === "string") return answer.trim() === "";
    if (Array.isArray(answer)) return answer.length === 0;
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

  return (
    <div className="flex h-screen bg-[#f3f2f1]">

      {/* LEFT SIDEBAR */}
      <div className="w-64 bg-white border-r p-4 overflow-auto">

        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(index)}
              className={`
                h-10 text-sm border rounded  
                ${index === currentIndex ? "bg-blue-600 text-white" : "bg-gray-200"}
                ${q.isAnswered ? "bg-green-500 text-white" : ""}
                ${q.isFlagged ? "border-yellow-400 border-2" : ""}
                cursor-pointer
              `}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* LEGEND */}
        <div className="mt-6 text-xs space-y-2">
          <div>
            <span className="inline-block w-3 h-3 bg-gray-300 mr-2"/> 
            Not answered
          </div>
          <div>
            <span className="inline-block w-3 h-3 bg-green-500 mr-2"/> 
            Answered
          </div>
          <div>
            <span className="inline-block w-3 h-3 border-2 border-yellow-400 mr-2"/> 
            Flagged
          </div>
        </div>
      </div>

      {/* RIGHT MAIN CONTENT */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="px-6 py-3 bg-white border-b">
          
          {/* TOP ROW */}
          <div className="font-semibold">
            Question {currentIndex + 1}
          </div>

          <div className="text-sm text-gray-600">
            ⏱ {formatTime(timeLeft)}
          </div>

          {/* PROGRESS BAR */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress ({answeredCount}/{totalQuestions})</span>
              <span>{progressPercent}%</span>
            </div>

            <div className="w-full h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-[#2f4f6f] rounded transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* QUESTION AREA */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white border p-6 rounded">
            <QuestionCard 
              key={currentQuestion.id}
              question={currentQuestion}
              sessionId={data.sessionId}
              onAnswer={handleAnswerChange}
              onFlag={handleFlagChange}
            />
          </div>
        </div>

        {/* FOOTER NAV */}
        <div className="flex justify-between p-4 bg-white border-t">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="px-6 py-2 bg-[#2f4f6f] text-white rounded disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>

          <button
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="px-6 py-2 bg-[#2f4f6f] text-white rounded disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}