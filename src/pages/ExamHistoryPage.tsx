import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getExamHistory } from "../api/examApi";
import type { UserExamHistoryItem } from "../types/exam";

const PAGE_SIZES = [5, 10, 20, 50] as const;

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
};

const parseSize = (value: string | null) => {
  const parsed = Number(value);
  if (PAGE_SIZES.includes(parsed as (typeof PAGE_SIZES)[number])) return parsed;
  return 10;
};

const parseOrder = (value: string | null) => {
  return value === "oldest" ? "oldest" : "newest";
};

export default function ExamHistoryPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [history, setHistory] = useState<UserExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageJumpInput, setPageJumpInput] = useState("1");
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const page = parsePage(searchParams.get("page"));
  const size = parseSize(searchParams.get("size"));
  const order = parseOrder(searchParams.get("order"));

  const setQueryParams = (nextPage: number, nextSize: number, nextOrder: "newest" | "oldest") => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(nextPage));
      params.set("size", String(nextSize));
      params.set("order", nextOrder);
      return params;
    });
  };

  useEffect(() => {
    if (!searchParams.get("page") || !searchParams.get("size") || !searchParams.get("order")) {
      setQueryParams(page, size, order);
    }
  }, [order, page, searchParams, size]);

  useEffect(() => {
    setPageJumpInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError("User ID is missing.");
      return;
    }

    setLoading(true);
    setError("");

    getExamHistory(userId, page, size)
      .then((res) => {
        const nextTotalPages = res.data.totalPages ?? 0;

        if (nextTotalPages > 0 && page >= nextTotalPages) {
          setQueryParams(nextTotalPages - 1, size, order);
          return;
        }

        setHistory(res.data.content ?? []);
        setTotalElements(res.data.totalElements ?? 0);
        setTotalPages(nextTotalPages);
      })
      .catch(() => {
        setError("Unable to load exam history. Please verify the user ID.");
      })
      .finally(() => setLoading(false));
  }, [order, page, size, userId]);

  const handlePageJump = () => {
    if (totalPages === 0) return;

    const requestedPage = Number(pageJumpInput);
    if (!Number.isFinite(requestedPage)) {
      setPageJumpInput(String(page + 1));
      return;
    }

    const normalizedPage = Math.min(Math.max(Math.floor(requestedPage), 1), totalPages) - 1;
    setQueryParams(normalizedPage, size, order);
  };

  const formatSubmittedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const sortedHistory = [...history].sort((a, b) => {
    const left = new Date(a.submittedAt).getTime();
    const right = new Date(b.submittedAt).getTime();

    if (Number.isNaN(left) || Number.isNaN(right)) {
      return 0;
    }

    return order === "newest" ? right - left : left - right;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif] flex items-center justify-center">
        Loading exam history...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif] px-4 py-6">
      <div className="max-w-[1140px] mx-auto">
        <h1 className="text-[24px] font-semibold mb-2">Previous Exams</h1>
        <div className="text-[14px] text-[#4a4a4a] mb-5">User ID: {userId}</div>

        {error && (
          <div className="mb-4 border border-[#d9a4a8] bg-[#fdf3f4] text-[#8b2631] px-4 py-3 text-[14px]">
            {error}
          </div>
        )}

        {!error && history.length === 0 && (
          <div className="bg-white border border-[#c9c9c9] p-6 text-[14px] text-[#555]">
            No previous exams found for this user.
          </div>
        )}

        {!error && history.length > 0 && (
          <div className="bg-white border border-[#c9c9c9] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#dcdcdc] bg-[#fafafa] flex flex-wrap items-center justify-between gap-4">
              <div className="text-[13px] text-[#444]">
                Showing {history.length} of {totalElements} exams
              </div>

              <div className="flex items-center gap-4 text-[13px]">
                <div className="flex items-center gap-2">
                  <label htmlFor="history-order" className="text-[#444] font-medium">
                    Sort
                  </label>
                  <select
                    id="history-order"
                    value={order}
                    onChange={(e) => setQueryParams(0, size, parseOrder(e.target.value))}
                    className="h-9 px-3 border border-[#767676] bg-white text-[13px] font-medium cursor-pointer rounded-[2px] transition-all hover:border-[#0078d4] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] focus:ring-offset-0"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="history-page-size" className="text-[#444] font-medium">
                    Per Page
                  </label>
                  <select
                    id="history-page-size"
                    value={size}
                    onChange={(e) => {
                      setQueryParams(0, Number(e.target.value), order);
                    }}
                    className="h-9 px-3 border border-[#767676] bg-white text-[13px] font-medium cursor-pointer rounded-[2px] transition-all hover:border-[#0078d4] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] focus:ring-offset-0"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1.4fr_0.95fr] bg-[#f3f3f3] border-b border-[#c9c9c9]">
              <div className="px-4 py-3 text-[12px] font-semibold text-[#444] uppercase">Exam Code</div>
              <div className="px-4 py-3 text-[12px] font-semibold text-[#444] uppercase">Score</div>
              <div className="px-4 py-3 text-[12px] font-semibold text-[#444] uppercase">Result</div>
              <div className="px-4 py-3 text-[12px] font-semibold text-[#444] uppercase">Submitted At</div>
              <div className="px-4 py-3 text-[12px] font-semibold text-[#444] uppercase">Action</div>
            </div>

            {sortedHistory.map((item) => (
              <div
                key={item.sessionId}
                className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1.4fr_0.95fr] border-b border-[#ececec] items-center"
              >
                <div className="px-4 py-3 text-[14px] text-[#1f1f1f]">{item.examCode}</div>
                <div className="px-4 py-3 text-[14px] text-[#1f1f1f]">{Math.round(item.score)}</div>
                <div className="px-4 py-3 text-[14px]">
                  <span
                    className={`inline-block px-2 py-[2px] text-[12px] font-semibold border ${
                      item.passed
                        ? "bg-[#e8f3e8] text-[#1d5a20] border-[#b6d2b8]"
                        : "bg-[#fbeaec] text-[#8b2631] border-[#e2b0b6]"
                    }`}
                  >
                    {item.passed ? "Passed" : "Failed"}
                  </span>
                </div>
                <div className="px-4 py-3 text-[14px] text-[#333]">{formatSubmittedAt(item.submittedAt)}</div>
                <div className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/history/${item.sessionId}/review`)}
                    className="h-8 px-3 bg-[#2d4e73] text-white border border-[#294568] text-[13px] font-semibold hover:bg-[#234162]"
                  >
                    Review Answers
                  </button>
                </div>
              </div>
            ))}

            <div className="px-4 py-3 border-t border-[#dcdcdc] bg-[#fafafa] flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] text-[#444]">
                Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQueryParams(Math.max(page - 1, 0), size, order)}
                  disabled={page === 0 || loading}
                  className="h-8 px-3 bg-white text-[#1f1f1f] border border-[#8a8a8a] text-[13px] font-semibold disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setQueryParams(page + 1 < totalPages ? page + 1 : page, size, order)}
                  disabled={loading || totalPages === 0 || page + 1 >= totalPages}
                  className="h-8 px-3 bg-white text-[#1f1f1f] border border-[#8a8a8a] text-[13px] font-semibold disabled:opacity-50"
                >
                  Next
                </button>
                <div className="flex items-center gap-1 ml-2">
                  <label htmlFor="history-page-jump" className="text-[13px] text-[#444]">
                    Page
                  </label>
                  <input
                    id="history-page-jump"
                    value={pageJumpInput}
                    onChange={(e) => setPageJumpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handlePageJump();
                      }
                    }}
                    className="h-8 w-16 px-2 border border-[#8a8a8a] bg-white text-[13px]"
                  />
                  <button
                    onClick={handlePageJump}
                    disabled={loading || totalPages === 0}
                    className="h-8 px-3 bg-white text-[#1f1f1f] border border-[#8a8a8a] text-[13px] font-semibold disabled:opacity-50"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={() => navigate("/")}
            className="h-9 px-5 bg-white text-[#1f1f1f] border border-[#7b7b7b] text-[14px] font-semibold hover:bg-[#f5f5f5]"
          >
            Back to Start
          </button>
        </div>
      </div>
    </div>
  );
}
