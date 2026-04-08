import { useEffect, useRef, useState } from "react";
import type { Question } from "../types/exam";
import { markVisited, saveAnswer, toggleFlag } from "../api/examApi";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragOverEvent } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";

interface Props {
  question: Question;
  sessionId: string;
  onAnswer: (id: string, answer: any) => void;
  onFlag: (id: string) => void;
  onSavingChange?: (saving: boolean) => void;
}

// Sortable item component
function SortableItem({ id, text}: { id: string; text: string; }) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = 
    useSortable({id});
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 w-full h-full px-3 border border-[#9fb1c9] bg-white text-[14px] cursor-grab select-none"
    >
      <span className="text-[#55708f] text-sm select-none">::</span>
      <span className="truncate text-[14px] text-[#1f1f1f]">{text}</span>
    </div>
  );
}

// Drag item component
function DraggableItem({ id, text }: { id: string; text: string; }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = 
    useDraggable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 px-3 h-11 mb-2 border border-[#9fb1c9] bg-white text-[14px] cursor-grab select-none"
    >
      <span className="text-[#55708f] text-sm select-none">::</span>
      <span className="truncate text-[14px] text-[#1f1f1f]">{text}</span>
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
  onSavingChange,
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

  // Save and sync parent
  const handleSave = async (newAnswer: any) => {
    setAnswer(newAnswer);
    onAnswer(question.id, newAnswer);

    onSavingChange?.(true);
    try {
      await saveAnswer({
        sessionId,
        questionId: question.id,
        answer: newAnswer,
      });
    } finally {
      onSavingChange?.(false);
    }
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

    onSavingChange?.(true);
    try {
      await saveAnswer({
        sessionId,
        questionId: question.id,
        answer: empty,
      });
    } finally {
      onSavingChange?.(false);
    }
  }

  // SINGLE CHOICE
  const renderSingleChoice = () => 
    question.options?.map((opt, idx) => (
      <label
        key={`${question.id}-${opt}`}
        className="flex items-center gap-2.5 mb-2.5 text-[14px] text-[#1f1f1f]"
      >
        <input
          type="radio"
          name={question.id}
          checked={answer === opt}
          onChange={() => handleSave(opt)}
          className="w-[15px] h-[15px] accent-[#2d4e73]"
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
        className="flex items-center gap-2.5 mb-2.5 text-[14px] text-[#1f1f1f]"
      >
        <input 
          type="checkbox"
          checked={selected.includes(opt)}
          className="w-[15px] h-[15px] accent-[#2d4e73]"
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
    const allChoices = question.options || [];

    const toLabel = (value: string) =>
      value
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

    return Object.entries(question.optionMap || {}).map(
      ([key, label]) => {
        const selected = map[key] || "";

        return (
          <div
            key={`${question.id}-${key}`}
            className="flex flex-wrap md:flex-nowrap items-center gap-3 border border-[#d3d8df] rounded-[8px] px-3 py-3 mb-2.5 bg-[#fcfdff]"
          >
            <div className="w-full md:w-[420px] min-w-[220px]">
              <div className="text-[11px] tracking-[0.06em] uppercase font-semibold text-[#5a6f88] mb-1">
                Service
              </div>
              <div className="text-[14px] text-[#1f1f1f] leading-5">{label}</div>
            </div>

            <div className="w-[220px] md:w-[240px]">
              <select
                id={`${question.id}-${key}`}
                className="h-10 border border-[#b8c4d2] rounded-[6px] px-2.5 w-full bg-white text-[14px] text-[#1f1f1f] focus:outline-none focus:border-[#2d4e73] focus:ring-1 focus:ring-[#2d4e73]"
                value={selected}
                onChange={(e) => {
                  const updated = {
                    ...map,
                    [key]: e.target.value,
                  };
                  handleSave(updated);
                }}
              >
                <option value="" />
                {allChoices.map((choice) => (
                  <option key={`${key}-${choice}`} value={choice}>
                    {toLabel(choice)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      }
    );
  };

  // ORDERING
  const renderOrdering = () => {
    const sensors = useSensors(useSensor(PointerSensor));

    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    const allOptions = question.options || [];
    const normalizedAnswer: (string | null)[] = Array.isArray(answer) ? answer : [];
    const selected: (string | null)[] = Array(allOptions.length).fill(null);

    normalizedAnswer.forEach((item, index) => {
      if (index < selected.length && typeof item === "string" && allOptions.includes(item)) {
        selected[index] = item;
      }
    });

    const available = allOptions.filter(opt => !selected.includes(opt));

    const placeAtSlot = (
      slots: (string | null)[],
      value: string,
      slotIndex: number
    ) => {
      const safeIndex = Math.max(0, Math.min(slotIndex, allOptions.length - 1));
      const updated = [...slots];

      const fromIndex = updated.indexOf(value);
      if (fromIndex >= 0) {
        updated[fromIndex] = null;
      }

      const displaced = updated[safeIndex];
      updated[safeIndex] = value;

      // Swap when dragging one selected item onto another selected slot.
      if (fromIndex >= 0 && displaced && fromIndex !== safeIndex) {
        updated[fromIndex] = displaced;
      }

      return updated;
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const getDropIndex = () => {
        if (overId.startsWith("slot-")) {
          return Number(overId.split("-")[1]);
        }

        const itemIndex = selected.indexOf(overId);
        if (itemIndex >= 0) {
          return itemIndex;
        }

        return null;
      };

      const dropIndex = getDropIndex();

      // Left -> Right
      if (available.includes(activeId) && dropIndex !== null) {
        const updated = placeAtSlot(selected, activeId, dropIndex);
        handleSave(updated);
        return;
      }

      // Right -> Left
      if (selected.includes(activeId) && overId === "actions") {
        const updated = selected.map((item) => (item === activeId ? null : item));
        handleSave(updated);
        return;
      }

      // Reorder inside RIGHT
      if (selected.includes(activeId) && dropIndex !== null) {
        const updated = placeAtSlot(selected, activeId, dropIndex);
        handleSave(updated);
      }
    };

    const handleDragOver = (event: DragOverEvent) => {
      setOverId((event.over?.id as string) || null);
    };

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragOver={handleDragOver}
        onDragEnd={(e) => {
          handleDragEnd(e);
          setActiveId(null);
          setOverId(null);
        }}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">

          {/* LEFT: ACTIONS */}
          <div>
            <div className="font-semibold text-[15px] leading-none mb-2.5 text-[#1f1f1f]">Actions</div>

            <Droppable id="actions">
              <div className="border border-[#a5b6cc] p-2.5 bg-[#fcfdff] min-h-[300px]">
                {available.map(item => (
                  <DraggableItem key={item} id={item} text={item} />
                ))}
              </div>
            </Droppable>
          </div>

          {/* RIGHT: SELECTED */}
          <div>
            <div className="font-semibold text-[15px] leading-none mb-2.5 text-[#1f1f1f]">Answer Area</div>

            <div className="border border-[#a5b6cc] p-2.5 bg-[#fcfdff] min-h-[300px] flex flex-col gap-2">
              {Array.from({ length: allOptions.length }).map((_, index) => {
                const item = selected[index];
                const slotId = `slot-${index}`;
                const isHoverTarget = overId === slotId || (item !== null && overId === item);

                return (
                  <Droppable key={index} id={slotId}>
                    <div
                      className={`h-11 border border-dashed flex items-center transition-colors ${
                        isHoverTarget
                          ? "border-[#2d76d2] bg-[#eaf3ff]"
                          : "border-[#c0ccdc] bg-white"
                      }`}
                    >
                      {item ? (
                        <SortableItem id={item} text={item} />
                      ) : (
                        <span className="text-[#8ea0b7] text-[14px] px-3 w-full">
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
            <div className="flex items-center gap-3 h-11 px-3 bg-white border border-[#99aac4] shadow text-[14px]">
              <span className="text-[#55708f] text-sm select-none">::</span>
              <span className="text-[14px]">{activeId}</span>
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
    <div className="text-[#1f1f1f] px-1">
      {/* QUESTION */}
      <div className="mb-5 text-[18px] font-normal text-left leading-6">
        {question.text}
      </div>

      {/* OPTIONS */}
      <div className="mb-6">{renderByType()}</div>

      {/* ACTION BAR */}
      <div className="flex justify-between border-t border-[#b4b4b4] pt-3 text-[13px]">
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-[13px] text-[#1f1f1f] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={question.isFlagged}
              onChange={handleFlag}
              className="w-[15px] h-[15px] accent-[#2d4e73]"
            />
            Mark for review
          </label>

          <button
            onClick={handleReset}
            className="h-8 px-4 bg-[#6f6f72] text-white border border-[#626266] rounded-full cursor-pointer text-[13px] leading-none inline-flex items-center gap-2 transition-colors hover:bg-white hover:text-[#4a4a4a] hover:border-[#808080] active:bg-[#ececec]"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-[13px] h-[13px]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2.5 8a5.5 5.5 0 1 0 1.9-4.15"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M2.5 2.75v3.1h3.1"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Reset Answer
          </button>
        </div>
      </div>
    </div>
  );
}