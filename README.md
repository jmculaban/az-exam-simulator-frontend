# Azure Exam Simulator - Frontend

A modern, responsive React-based frontend for an Azure certification exam simulator. This application provides a realistic exam-taking experience with multiple-choice and single-choice questions, drag-and-drop ordering questions, timed sessions, and exam history tracking.

## Overview

The Azure Exam Simulator Frontend is a TypeScript + React + Vite application that simulates Microsoft Azure certification exams (such as AZ-900). It features:

- **Responsive Design**: Built with Tailwind CSS for a professional Microsoft-inspired interface
- **Real-time Exam Sessions**: Track time remaining, question progress, and navigation
- **Multiple Question Types**: Support for multiple-choice, single-choice, and drag-and-drop questions
- **Exam History**: Review previous exam attempts and track performance
- **Drag-and-Drop Interface**: Using @dnd-kit for reordering questions
- **User Management**: Persistent user sessions with local storage

## Tech Stack

- **React 19.2.4** - UI framework
- **TypeScript 5.9.3** - Type safety
- **Vite 8.0.1** - Build tool with HMR
- **Tailwind CSS 4.2.2** - Styling
- **React Router 7.13.2** - Client-side routing
- **Axios 1.14.0** - HTTP client for API communication
- **@dnd-kit** - Drag and drop functionality
- **ESLint + TypeScript ESLint** - Code quality

## Project Structure

```
src/
├── api/                 # API client for backend communication
│   └── examApi.ts      # Exam API endpoints (start, resume, submit, etc.)
├── components/         # Reusable React components
│   ├── QuestionCard.tsx    # Individual question display
│   ├── QuestionPalette.tsx # Question navigation/palette
│   └── Timer.tsx           # Countdown timer component
├── hooks/              # Custom React hooks
│   └── useExam.ts      # Exam state management hook
├── pages/              # Page components for each route
│   ├── StartExamPage.tsx         # Exam setup and user entry
│   ├── ExamPage.tsx              # Main exam taking interface
│   ├── ReviewPage.tsx            # Post-exam review
│   ├── ResultPage.tsx            # Exam results display
│   ├── ExamHistoryPage.tsx       # User exam history
│   └── HistoryReviewPage.tsx     # Review previous exam
├── types/              # TypeScript type definitions
│   └── exam.ts         # Exam-related types
├── App.tsx             # Main app component with routing
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn installed
- Backend server running on `http://localhost:8081` (see backend configuration in `examApi.ts`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

## Key Features

### Exam Management
- **Start Exam**: Enter exam code and user ID to begin a new session
- **Resume Exam**: Continue incomplete exam sessions
- **Timer**: Track remaining exam time with countdown
- **Question Navigation**: Jump between questions using the question palette

### Question Types
- Multiple choice questions with single selection
- Single choice with different UI presentation
- Drag-and-drop ordering questions
- Question flagging for later review

### User Experience
- **Persistent Sessions**: User ID stored in localStorage for seamless continuity
- **Progress Tracking**: Visual indication of answered vs. unanswered questions
- **Exam History**: Browse and review previous exam attempts
- **Responsive Layout**: Works seamlessly on desktop and tablet devices

### Styling
- Microsoft-inspired design with Segoe UI font
- Color scheme matching Azure/Microsoft branding
- Tailwind CSS for utility-first styling
- Smooth transitions and hover effects

## API Integration

The frontend communicates with the backend API at `http://localhost:8081/api`. Key endpoints:

- `POST /exams/start` - Start a new exam session
- `GET /exams/{sessionId}/resume` - Resume an exam
- `POST /exam-answers` - Save question answers
- `POST /exams/{sessionId}/submit` - Submit exam for grading
- `POST /users` - Create or ensure user exists
- `GET /user/{userId}/exam-history` - Get user's exam history

## Development Notes

- The application uses React Router for client-side navigation
- Exam state is managed through the `useExam` hook
- All API calls go through the centralized `examApi.ts` module
- TypeScript strict mode is enabled for type safety
- ESLint is configured for code quality checks
