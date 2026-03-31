import axios from "axios";
import type { ResumeExamResponse, ExamResult, SectionReviewResponse } from "../types/exam";

const API = axios.create({
  baseURL: "http://localhost:8081/api",
});

export const startExam = (examCode: string, userId: string) =>
  API.post<{ id: string }>("/exams/start", { examCode, userId });

export const resumeExam = (sessionId: string) =>
  API.get<ResumeExamResponse>(`/exams/${sessionId}/resume`);

export const saveAnswer = (payload: {
  sessionId: string;
  questionId: string;
  answer: any;
}) => API.post("/exam-answers", payload);

export const submitExam = (sessionId: string) =>
  API.post<ExamResult>(`/exams/${sessionId}/submit`);

export const getResult = (sessionId: string) =>
  API.get<ExamResult>(`/exams/${sessionId}/result`);

export const getTimer = (sessionId: string) =>
  API.get<{ remainingSeconds: number; expired: boolean }>(
    `/exams/${sessionId}/timer`
  );

export const toggleFlag = (
  sessionId: string,
  questionId: string
) =>
  API.post(`/exam-state/${sessionId}/${questionId}/flag`);

export const markVisited = (sessionId: string, questionId: string) =>
  API.post(`/exam-state/${sessionId}/${questionId}/visit`);

export const getSectionReview = (sessionId: string) =>
  API.get<SectionReviewResponse>(`/exams/${sessionId}/section-review`);