import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResult, getSectionReview } from "../api/examApi";
import type { ExamResult } from "../types/exam";

function PassArtwork() {
	const burst = (
		cx: number,
		cy: number,
		rays: number,
		inner: number,
		outer: number,
		color: string,
		width = 3
	) =>
		Array.from({ length: rays }).map((_, i) => {
			const a = (Math.PI * 2 * i) / rays;
			const x1 = cx + Math.cos(a) * inner;
			const y1 = cy + Math.sin(a) * inner;
			const x2 = cx + Math.cos(a) * outer;
			const y2 = cy + Math.sin(a) * outer;
			return (
				<line
					key={`${cx}-${cy}-${i}`}
					x1={x1}
					y1={y1}
					x2={x2}
					y2={y2}
					stroke={color}
					strokeWidth={width}
					strokeLinecap="round"
					opacity="0.95"
				/>
			);
		});

	return (
		<svg viewBox="0 0 540 320" className="w-full h-full" aria-hidden="true">
			<rect x="0" y="0" width="540" height="320" fill="#ffffff" />
			<g>
				{burst(130, 205, 26, 26, 84, "#f4b400", 4)}
				{burst(248, 155, 30, 20, 106, "#50c8c7", 4)}
				{burst(286, 148, 24, 22, 84, "#ef476f", 4)}
				{burst(365, 195, 24, 20, 88, "#59c3f0", 4)}
				{burst(155, 78, 18, 12, 42, "#ff7043", 3)}
				{burst(382, 82, 20, 14, 46, "#8bc34a", 3)}
				{burst(248, 255, 16, 10, 38, "#f0c808", 3)}
				{burst(298, 268, 16, 9, 36, "#50c8c7", 3)}
				{burst(210, 275, 14, 9, 34, "#a58be4", 3)}
			</g>
		</svg>
	);
}

function FailArtwork() {
	return (
		<svg viewBox="0 0 540 320" className="w-full h-full" aria-hidden="true">
			<defs>
				<linearGradient id="bgGrad" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stopColor="#fff7f7" />
					<stop offset="100%" stopColor="#fff" />
				</linearGradient>
			</defs>
			<rect x="0" y="0" width="540" height="320" fill="url(#bgGrad)" />
			<circle cx="270" cy="155" r="86" fill="#fff" stroke="#e06a6d" strokeWidth="8" />
			<line x1="230" y1="115" x2="310" y2="195" stroke="#d13438" strokeWidth="12" strokeLinecap="round" />
			<line x1="310" y1="115" x2="230" y2="195" stroke="#d13438" strokeWidth="12" strokeLinecap="round" />
			<circle cx="170" cy="90" r="8" fill="#f6b8ba" />
			<circle cx="375" cy="88" r="11" fill="#f8cacc" />
			<circle cx="355" cy="242" r="9" fill="#f6b8ba" />
			<circle cx="176" cy="246" r="12" fill="#f8cacc" />
		</svg>
	);
}

function SectionPerformance({ sections }: { sections: ExamResult["sections"] }) {
	if (!sections || sections.length === 0) return null;

	const marks = [0, 20, 40, 60, 80, 100];

	return (
		<div className="mt-6 border-t border-[#e2e2e2] pt-6">
			<h3 className="text-[22px] leading-[1.2] font-semibold text-[#1f3b63] mb-1">Performance by exam section</h3>
			<p className="text-[13px] leading-[1.45] text-[#2f2f2f] mb-4 max-w-[980px]">
				Each section and its corresponding percentage appears to the left of the chart. The length of
				the bars represents your section-level performance. Shorter bars reflect weaker performance,
				and longer bars reflect stronger performance.
			</p>

			<div className="space-y-3">
				{sections.map((section) => {
					const pct = Math.max(0, Math.min(100, Math.round(section.score)));
					const color = pct >= 70 ? "#2d4e73" : pct >= 40 ? "#b66b15" : "#b4232f";

					return (
						<div key={section.sectionId} className="grid grid-cols-[170px_1fr] md:grid-cols-[220px_1fr] items-center gap-2 md:gap-3">
							<div className="text-[14px] text-[#1f1f1f] truncate">{section.title}</div>
							<div className="relative h-[20px]">
								{marks.map((mark) => (
									<div
										key={mark}
										className="absolute top-0 bottom-0 border-l border-[#a9a9a9]"
										style={{ left: `${mark}%` }}
									/>
								))}
								<div className="absolute left-0 top-[7px] h-[6px] bg-[#efefef] w-full" />
								<div
									className="absolute left-0 top-[7px] h-[6px]"
									style={{ width: `${pct}%`, backgroundColor: color }}
								/>
							</div>
						</div>
					);
				})}
			</div>

			<div className="grid grid-cols-[170px_1fr] md:grid-cols-[220px_1fr] mt-1">
				<div />
				<div className="relative h-[16px] text-[11px] text-[#1f1f1f]">
					<span className="absolute left-0">0%</span>
					<span className="absolute right-0">100%</span>
				</div>
			</div>
		</div>
	);
}

export default function ResultPage() {
	const { sessionId } = useParams<{ sessionId: string }>();
	const navigate = useNavigate();
	const [result, setResult] = useState<ExamResult | null>(null);
	const [examMeta, setExamMeta] = useState<{ examCode: string; description: string } | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!sessionId) return;
		Promise.all([
			getResult(sessionId),
			getSectionReview(sessionId),
		])
			.then(([resultRes, sectionReviewRes]) => {
				setResult(resultRes.data);
				setExamMeta({
					examCode: sectionReviewRes.data.examCode,
					description: sectionReviewRes.data.description,
				});
			})
			.finally(() => setLoading(false));
	}, [sessionId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-[#efefef] font-[Segoe_UI,Tahoma,sans-serif] text-[#444]">
				Loading result...
			</div>
		);
	}

	if (!result) {
		return (
			<div className="flex items-center justify-center h-screen bg-[#efefef] font-[Segoe_UI,Tahoma,sans-serif] text-[#444]">
				Unable to load result.
			</div>
		);
	}

	const statusText = result.passed
		? "Congratulations, you passed!"
		: "Unfortunately, you did not pass.";

	return (
		<div className="min-h-screen bg-[#efefef] text-[#1f1f1f] font-[Segoe_UI,Tahoma,sans-serif]">
			<div className="max-w-[1120px] mx-auto px-4 md:px-6 py-5 md:py-7">
				<h1 className="text-[24px] leading-[1.15] font-semibold mb-3">Exam Results</h1>

				<div className="bg-white border border-[#c9c9c9] rounded-[3px] p-4 md:p-7">
					<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 md:gap-8 items-start">
						<div>
							<h2 className={`text-[30px] leading-[1.18] font-semibold mb-4 ${result.passed ? "text-[#2d4e73]" : "text-[#7a2226]"}`}>
								{statusText}
							</h2>

							{examMeta && (
								<div className="mb-3">
									<div className="text-[13px] font-semibold tracking-[0.04em] text-[#2d4e73] uppercase">
										{examMeta.examCode}
									</div>
									<div className="text-[13px] text-[#333] leading-5 mt-1">
										{examMeta.description}
									</div>
								</div>
							)}

							<div className="space-y-2 text-[15px] leading-[1.35] text-[#2d2d2d]">
								<div>
									Minimum score required to pass this exam: <strong>70</strong>
								</div>
								<div>
									Your score: <strong>{Math.round(result.score)}</strong>
								</div>
								<div>
									Correct answers: <strong>{result.correct}</strong> / <strong>{result.total}</strong>
								</div>
							</div>
						</div>

						<div className="w-full h-[300px] md:h-[430px] border border-[#ececec]">
							{result.passed ? <PassArtwork /> : <FailArtwork />}
						</div>
					</div>

					<SectionPerformance sections={result.sections} />
				</div>

				<div className="mt-4 flex justify-end">
					<button
						onClick={() => navigate("/")}
						className="flex items-center gap-2 h-[40px] px-6 bg-[#2d4e73] text-white border border-[#294568] text-[15px] font-semibold transition-colors hover:bg-[#234162]"
					>
						End
						<span className="text-[18px] leading-none">→</span>
					</button>
				</div>
			</div>
		</div>
	);
}
