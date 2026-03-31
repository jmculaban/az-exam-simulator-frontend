import { useEffect, useRef, useState } from "react";
import type { Question } from "../types/exam";
import { markVisited, saveAnswer, toggleFlag } from "../api/examApi";
import { CSS } from "@dnd-kit/utilities";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface Props {
  question: Question;
  sessionId: string;
  onAnswer: (id: string, answer: any) => void;
  onFlag: (id: string) => void;
}

// Drage item component
function SortableItem({
  id,
  text
}: {
  id: string;
  text: string;
}) {
  const {attributes, listeners, setNodeRef, transform, transition} = 
    useSortable({id});
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between p-3 mb-2 border rounded bg-white cursor-move"
    >
      <span>{text}</span>
      <span className="text-gray-400">≡</span>
    </div>
  )
}

export default function QuestionCard({ 
  question, 
  sessionId,
  onAnswer,
  onFlag,
}: Props) {
  const [answer, setAnswer] = useState<any>(question.userAnswer);
  const hasMarked = useRef(false);

  // Sync answer when navigating
  useEffect(() => {
    setAnswer(question.userAnswer);
  }, [question.userAnswer]);

  // mark visited
  useEffect(() => {
    if (hasMarked.current) return;
    hasMarked.current = true;
    markVisited(sessionId, question.id);
  }, [sessionId, question.id]);

  const isEmptyAnswer = (value: any) => {
    if (value == null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  };

  // Save and sync parent
  const handleSave = async (newAnswer: any) => {
    setAnswer(newAnswer);
    onAnswer(question.id, newAnswer);

    await saveAnswer({
      sessionId,
      questionId: question.id,
      answer: newAnswer,
    });
  };

  // Toggle flag
  const handleFlag = async () => {
    await toggleFlag(sessionId, question.id);
    onFlag(question.id);
  }

  const handleReset = async () => {
    const empty = 
      question.type === "MULTIPLE_CHOICE"
        ? []
        : question.type === "MATCHING"
        ? {}
        : null;

    setAnswer(empty);
    onAnswer(question.id, empty);

    await saveAnswer({
      sessionId,
      questionId: question.id,
      answer: empty,
    });
  }

  // SINGLE CHOICE
  const renderSingleChoice = () => 
    question.options?.map((opt, idx) => (
      <label
        key={`${question.id}-${opt}`}
        className="flex items-center gap-2 mb-2"
      >
        <input
          type="radio"
          name={question.id}
          checked={answer === opt}
          onChange={() => handleSave(opt)}
        />
        <span>{String.fromCharCode(65 + idx)}. {opt}</span>
      </label>
    ));

  // MULTIPLE CHOICE
  const renderMultipleChoice = () => {
    const selected: string[] = answer || [];

    return question.options?.map((opt, idx) => (
      <label
        key={`${question.id}-${opt}`}
        className="flex items-center gap-2 mb-2"
      >
        <input 
          type="checkbox"
          checked={selected.includes(opt)}
          onChange={() => {
            const updated = selected.includes(opt)
              ? selected.filter((o) => o !== opt)
              : [...selected, opt];
            handleSave(updated);
          }}
        />
        <span>{String.fromCharCode(65 + idx)}. {opt}</span>
      </label>
    ));
  };

  // MATCHING
  const renderMatching = () => {
    const map: Record<string, string> = answer || {};

    return Object.entries(question.optionMap || {}).map(
      ([key, label]) => (
        <div 
          key={`${question.id}-${key}`} 
          className="flex items-center justify-between border p-3 rounded mb-2"
        >
          <span className="w-1/2">{label}</span>

          <input
            className="border p-1 rounded w-1/2"
            value={map[key] || ""}
            onChange={(e) => {
              const updated = {
                ...map,
                [key]: e.target.value,
              };
              handleSave(updated);
            }}
          />
        </div>
      )
    );
  };

  // ORDERING
  const renderOrdering = () => {
    const list: string[] = answer || question.options || [];

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = list.indexOf(active.id as string);
      const newIndex = list.indexOf(over.id as string);

      const newList = arrayMove(list, oldIndex, newIndex);

      handleSave(newList);
    };

    return (
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={list} strategy={verticalListSortingStrategy}>
          {list.map((item) => (
            <SortableItem key={item} id={item} text={item} />
          ))}
        </SortableContext>
      </DndContext>
    );
  };

  // RENDER SWITCH
  const renderByType = () => {
    switch (question.type) {
      case "SINGLE_CHOICE":
        return renderSingleChoice();
      case "MULTIPLE_CHOICE":
        return renderMultipleChoice();
      case "MATCHING":
        return renderMatching();
      case "ORDERING":
        return renderOrdering();
      default:
        return <div>Unsupported type</div>;
    }
  };

  return (
    <div>
      {/* QUESTION */}
      <div className="mb-4 text-base font-medium">
        {question.text}
      </div>

      {/* OPTIONS */}
      <div className="mb-6">{renderByType()}</div>

      {/* ACTION BAR */}
      <div className="flex justify-between border-t pt-3 text-sm">
        <div className="flex gap-4">
          <button onClick={handleFlag} className="text-blue-600 cursor-pointer">
            {question.isFlagged ? "Unflag" : "Mark for review"}
          </button>

          <button onClick={handleReset} className="text-red-600 cursor-pointer">
            Reset Answer
          </button>
        </div>
      </div>
    </div>
  );
}