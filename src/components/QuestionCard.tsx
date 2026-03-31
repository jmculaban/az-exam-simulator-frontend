import { useEffect, useRef, useState } from "react";
import type { Question } from "../types/exam";
import { markVisited, saveAnswer, toggleFlag } from "../api/examApi";
import { CSS } from "@dnd-kit/utilities";
import { closestCenter, DndContext, DragOverlay, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface Props {
  question: Question;
  sessionId: string;
  onAnswer: (id: string, answer: any) => void;
  onFlag: (id: string) => void;
}

// Sortable item component
function SortableItem({ id, text}: { id: string; text: string; }) {
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
      className="w-full"
    >
      {text}
    </div>
  );
}

// Drag item component
function DraggableItem({ id, text }: { id: string; text: string; }) {
  const { attributes, listeners, setNodeRef, transform } = 
    useDraggable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="border p-2 mb-2 bg-white cursor-move rounded"
    >
      {text}
    </div>
  );
}

// Droppable container component
function Droppable({ id, children }: any) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef}>
      {children}
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
    const sensors = useSensors(useSensor(PointerSensor));

    const [activeId, setActiveId] = useState<string | null>(null);

    const allOptions = question.options || [];
    const selected: (string | null)[] =
      answer || Array(allOptions.length).fill(null);

    const available = allOptions.filter(opt => !selected.includes(opt));

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      let updated = [...selected];

      // Left -> Right
      if (available.includes(activeId) && overId.startsWith("slot-")) {
        const index = Number(overId.split("-")[1]);
        updated[index] = activeId;
        handleSave(updated.filter(Boolean));
        return;
      }

      // Right -> Left
      if (selected.includes(activeId) && overId === "actions") {
        updated = updated.map(i => (i === activeId ? null : i));
        handleSave(updated.filter(Boolean));
        return;
      }

      // Reorder inside RIGHT
      if (selected.includes(activeId) && overId.startsWith("slot-")) {
        const from = selected.indexOf(activeId);
        const to = Number(overId.split("-")[1]);

        updated[from] = null;
        updated[to] = activeId;

        handleSave(updated.filter(Boolean));
      }
    };

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={(e) => {
          handleDragEnd(e);
          setActiveId(null);
        }}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-2 gap-8 mt-4">

          {/* LEFT: ACTIONS */}
          <div>
            <div className="font-semibold mb-2">Actions</div>

            <Droppable id="actions">
              <div className="border p-3 bg-gray-50 min-h-[300px] rounded">
                {available.map(item => (
                  <DraggableItem key={item} id={item} text={item} />
                ))}
              </div>
            </Droppable>
          </div>

          {/* RIGHT: SELECTED */}
          <div>
            <div className="font-semibold mb-2">Answer Area</div>

            <div className="border p-3 bg-gray-100 min-h-[300px] rounded flex flex-col gap-2">
              {Array.from({ length: allOptions.length }).map((_, index) => {
                const item = selected[index];

                return (
                  <Droppable key={index} id={`slot-${index}`}>
                    <div className="h-14 border-2 border-dashed border-gray-300 rounded flex items-center px-2 bg-white hover: border-blue-400 transition">
                      {item ? (
                        <SortableItem id={item} text={item} />
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Drop here
                        </span>
                      )}
                    </div>
                  </Droppable>
                );
              })}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="px-3 py-1 bg-white border shadow text-sm">
              {activeId}
            </div>
          ) : null}
        </DragOverlay>
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