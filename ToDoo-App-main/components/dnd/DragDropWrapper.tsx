"use client";

import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { type Task } from "@/types";

interface DragDropWrapperProps {
  tasks: Task[];
  onReorder: (newTasks: Task[]) => void;
  renderTask: (task: Task) => React.ReactNode;
}

export const DragDropWrapper: React.FC<DragDropWrapperProps> = ({
  tasks,
  onReorder,
  renderTask,
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(tasks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="droppable">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="mb-2"
                    style={{
                      ...provided.draggableProps.style,
                      transition: snapshot.isDragging
                        ? "none"
                        : "transform 250ms ease, box-shadow 250ms ease",
                      boxShadow: snapshot.isDragging
                        ? "0 8px 16px rgba(0,0,0,0.25)"
                        : "0 1px 3px rgba(0,0,0,0.1)",
                      borderRadius: "8px",
                    }}
                  >
                    {/* 🔥 Task render burada */}
                    <div>{renderTask(task)}</div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
