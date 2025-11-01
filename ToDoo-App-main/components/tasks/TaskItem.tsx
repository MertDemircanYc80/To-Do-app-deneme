"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pin, Trash2, Plus, CheckCircle2, Circle, Pencil, Clock } from "lucide-react";
import { createId } from "@/lib/day-templates";
import { type Task, type Project, type View, type Priority } from "@/types";

interface TaskItemProps {
  task: Task;
  projects: Project[];
  view: View;
  getPriorityColor: (p: Task["priority"]) => string;
  toggleTask: (id: string) => void;
  togglePin: (id: string) => void;
  deleteTask: (id: string) => void;

  onAddSubTask?: (taskId: string, subTaskText: string) => void;
  onToggleSubTask?: (taskId: string, subTaskId: string) => void;
  onDeleteSubTask?: (taskId: string, subTaskId: string) => void;
  onUpdateNotes?: (taskId: string, notes: string) => void;

  onCreateTemplate?: (taskId: string, templateName: string) => void;
  onUpdateTaskText?: (taskId: string, newText: string) => void;
}

// Instance id (abc123-YYYY-MM-DD) -> orijinal id
const getBaseId = (id: string) => {
  const m = id.match(/\d{4}-\d{2}-\d{2}$/);
  if (!m) return id;
  return id.slice(0, -m[0].length - 1);
};

const humanizeMinutes = (mins?: number) => {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  projects,
  view,
  getPriorityColor,
  toggleTask,
  togglePin,
  deleteTask,
  onAddSubTask,
  onToggleSubTask,
  onDeleteSubTask,
  onUpdateNotes,
  onCreateTemplate,
  onUpdateTaskText,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [subText, setSubText] = useState("");
  const [editNotes, setEditNotes] = useState(task.notes || "");
  const [templateName, setTemplateName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  // optimistic local subs
  const [localSubs, setLocalSubs] = useState(task.subTasks ?? []);
  useEffect(() => {
    setLocalSubs(task.subTasks ?? []);
  }, [task.subTasks, task.id]);

  const baseId = useMemo(() => getBaseId(task.id), [task.id]);
  const isOccurrence = useMemo(() => /\d{4}-\d{2}-\d{2}$/.test(task.id), [task.id]);

  const project = task.project ? projects.find((p) => p.id === task.project) : undefined;

  // Güvenli priority anahtarı (undefined ise "medium")
  const priorityKey = (task.priority ?? "medium") as Priority;
  const priorityColor = getPriorityColor(priorityKey);

  const subTasks = useMemo(
    () =>
      [...localSubs].sort((a, b) =>
        a.completed === b.completed ? 0 : a.completed ? 1 : -1
      ),
    [localSubs]
  );

  const completedSubs = subTasks.filter((s) => s.completed).length;
  const percent = subTasks.length > 0 ? Math.round((completedSubs / subTasks.length) * 100) : 0;

  // Tüm Priority değerlerini kapsayan harita (+ urgent eklendi)
  const priorityBg: Record<Priority, string> = {
    lowest: "bg-gray-800",
    low: "bg-blue-900/20",
    medium: "bg-yellow-900/15",
    high: "bg-orange-900/20",
    highest: "bg-red-900/20",
  };

  const completedStyle = task.completed
    ? "opacity-80 bg-gray-700 border-l-4 border-green-500 saturate-75"
    : "";

  const timeLabel = task.time || null;
  const durationLabel = humanizeMinutes(task.duration);

  /* ---------------------------------------------------
     WEEK
  ----------------------------------------------------*/
  if (view === "week") {
    return (
      <div
        className={`group flex items-center justify-between rounded-md border border-gray-700 px-2 py-1 cursor-pointer transition-colors
        ${priorityBg[priorityKey]} ${task.completed ? "opacity-60" : "hover:bg-gray-700/40"}`}
        onClick={() => toggleTask(task.id)}
        title={task.completed ? "Uncomplete" : "Complete"}
      >
        <p className={`text-xs truncate ${task.completed ? "line-through text-gray-400" : "text-gray-100"}`}>
          {task.text}
        </p>
        <button
          className="p-1 rounded-full text-red-300 hover:bg-red-900/30 opacity-80 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            deleteTask(baseId);
          }}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------
     MONTH
  ----------------------------------------------------*/
  if (view === "month") {
    return (
      <div
        className={`flex items-center justify-between border border-gray-700 rounded-lg px-2 py-1
        shadow-sm ${priorityBg[priorityKey]} ${completedStyle} hover:bg-gray-700/40 transition-all`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shadow-[0_0_6px] shadow-current"
            style={{ color: priorityColor, backgroundColor: priorityColor }}
          />
          <p className={`text-xs truncate ${task.completed ? "line-through text-gray-400" : "text-white"}`}>
            {task.text}
          </p>
        </div>
        <button
          onClick={() => deleteTask(baseId)}
          className="p-1 rounded-full transition-all duration-200 text-red-300 hover:bg-red-900/30 hover:scale-110 hover:shadow-[0_0_8px_#ef4444]"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------
     TODAY / PROJECT / TASKS
  ----------------------------------------------------*/
  return (
    <Card
      className={`p-3 border border-gray-700 ${priorityBg[priorityKey]} ${completedStyle}
      rounded-2xl shadow-md transition-all duration-200 
      hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5`}
    >
      <div className="flex items-start gap-3">
        {/* Toggle complete */}
        <button
          onClick={() => toggleTask(task.id)}
          className="mt-1 p-1 rounded-full hover:bg-green-900/30 transition-all hover:scale-110 hover:shadow-[0_0_8px_#22c55e]"
          title={task.completed ? "Uncomplete" : "Complete"}
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-gray-200" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div
            className="flex items-center justify-between gap-2 cursor-pointer select-none"
            onClick={() => !isEditing && setExpanded((s) => !s)}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => {
                      setIsEditing(false);
                      const t = editText.trim();
                      if (t && onUpdateTaskText) onUpdateTaskText(baseId, t);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditing(false);
                        const t = editText.trim();
                        if (t && onUpdateTaskText) onUpdateTaskText(baseId, t);
                      }
                    }}
                    className="text-sm bg-gray-700 text-white px-2 py-1 rounded"
                    autoFocus
                  />
                ) : (
                  <p
                    className={`truncate ${task.completed ? "line-through text-gray-400" : "text-white"} ${
                      expanded ? "font-medium" : ""
                    } text-sm`}
                  >
                    {task.text}
                  </p>
                )}
                <span
                  className="inline-block w-2 h-2 rounded-full shadow-[0_0_8px] shadow-current"
                  style={{ color: priorityColor, backgroundColor: priorityColor }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-300">
                {timeLabel && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3 h-3" />
                    {timeLabel}
                  </span>
                )}
                {durationLabel && <span>- {durationLabel}</span>}
                {task.date && <span>- {task.date}</span>}
                {project && <span className="px-2 py-0.5 rounded-full border border-gray-600">{project.name}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setEditText(task.text);
                }}
                className="p-1 rounded-full text-gray-300 hover:bg-gray-700 hover:scale-110 hover:shadow-[0_0_8px_#d1d5db]"
                title="Edit task"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(baseId);
                }}
                title={task.pinned ? "Unpin" : "Pin"}
                className={`p-1 rounded-full transition-all duration-200 ${
                  task.pinned
                    ? "text-yellow-300 hover:bg-yellow-900/30 hover:scale-110 hover:shadow-[0_0_8px_#facc15]"
                    : "text-gray-300 hover:bg-gray-700 hover:scale-110 hover:shadow-[0_0_8px_#d1d5db]"
                }`}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(baseId);
                }}
                className="p-1 rounded-full transition-all duration-200 text-red-300 hover:bg-red-900/30 hover:scale-110 hover:shadow-[0_0_8px_#ef4444]"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress */}
          {subTasks.length > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 h-2 rounded-lg shadow-inner overflow-hidden">
                <div
                  className="h-2 rounded-lg transition-[width] duration-300"
                  style={{
                    width: `${percent}%`,
                    background: "linear-gradient(90deg,#22c55e,#3b82f6)",
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{percent}% completed</p>
            </div>
          )}

          {/* Expanded */}
          {expanded && (
            <>
              {/* Subtasks */}
              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                {subTasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between bg-gray-700/60 px-2 py-1 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (typeof onToggleSubTask === "function") onToggleSubTask(baseId, sub.id);
                          setLocalSubs((prev) =>
                            prev.map((s) => (s.id === sub.id ? { ...s, completed: !s.completed } : s))
                          );
                        }}
                        title={sub.completed ? "Uncomplete subtask" : "Complete subtask"}
                        className="p-1 rounded-full hover:bg-green-900/30 transition-all hover:scale-110 hover:shadow-[0_0_6px_#22c55e]"
                      >
                        {sub.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                      <span
                        className={`text-xs ${sub.completed ? "line-through text-gray-400" : "text-gray-100"}`}
                      >
                        {sub.text}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof onDeleteSubTask === "function") onDeleteSubTask(baseId, sub.id);
                        setLocalSubs((prev) => prev.filter((s) => s.id !== sub.id));
                      }}
                      className="p-1 rounded-full hover:bg-red-900/30 text-gray-200 transition-all hover:scale-110 hover:shadow-[0_0_6px_#ef4444]"
                      title="Delete subtask"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <Input
                    value={subText}
                    onChange={(e) => setSubText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const txt = subText.trim();
                        if (!txt) return;
                        if (typeof onAddSubTask === "function") onAddSubTask(baseId, txt);
                        setLocalSubs((prev) => [...prev, { id: createId(), text: txt, completed: false }]);
                        setSubText("");
                      }
                    }}
                    placeholder="Add subtask..."
                    className="bg-gray-700 border-gray-600 text-white text-xs rounded-lg"
                  />
                  <Button
                    onClick={() => {
                      const txt = subText.trim();
                      if (!txt) return;
                      if (typeof onAddSubTask === "function") onAddSubTask(baseId, txt);
                      setLocalSubs((prev) => [...prev, { id: createId(), text: txt, completed: false }]);
                      setSubText("");
                    }}
                    className="bg-green-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-green-700 hover:shadow-[0_0_8px_#22c55e]"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Notes & Template */}
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Take a quick note..."
                  className="bg-gray-800/90 text-white text-xs w-full rounded-lg p-2
                             shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={() => {
                      if (typeof onUpdateNotes === "function") onUpdateNotes(baseId, editNotes);
                    }}
                    className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700 hover:shadow-[0_0_8px_#3b82f6]"
                  >
                    Save Notes
                  </Button>

                  {onCreateTemplate && (
                    <>
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name"
                        className="bg-gray-700 border-gray-600 text-white text-xs rounded-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const name = templateName.trim();
                            if (!name) return;
                            onCreateTemplate(baseId, name);
                            setTemplateName("");
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          const name = templateName.trim();
                          if (!name) return;
                          onCreateTemplate(baseId, name);
                          setTemplateName("");
                        }}
                        className="bg-purple-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-purple-700 hover:shadow-[0_0_8px_#a855f7]"
                      >
                        Create Template
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
