"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Project, type View, type Template } from "@/types";
import { Settings as SettingsIcon, ChevronRight, ChevronLeft } from "lucide-react";
import type { DayTemplate } from "@/lib/day-templates";

interface SidebarProps {
  projects: Project[];
  templates: Template[];
  dayTemplates: DayTemplate[];
  isExpanded: boolean;
  onToggle: () => void;
  onCreateProject: (name: string) => void;
  onSetView: (view: View) => void;
  onSetCurrentProjectId: (id: string) => void;
  onSetCurrentDayTemplateId: (id: string) => void;
  onUseTemplate: (templateId: string) => void;
  onUseDayTemplate: (templateId: string, dateOverride?: string) => void;
  onCreateDayTemplate: (name: string) => void;
  onDeleteDayTemplate: (templateId: string) => void;
  onUpdateDayTemplate: (updated: DayTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onDeleteProject: (projectId: string) => void; // ? proje sil
}

export const Sidebar = ({
  projects,
  templates,
  dayTemplates,
  isExpanded,
  onToggle,
  onCreateProject,
  onSetView,
  onSetCurrentProjectId,
  onSetCurrentDayTemplateId,
  onUseTemplate,
  onUseDayTemplate,
  onCreateDayTemplate,
  onDeleteDayTemplate,
  onUpdateDayTemplate,
  onDeleteTemplate,
  onDeleteProject,
}: SidebarProps) => {
  const [newProjectName, setNewProjectName] = useState("");
  const [newDayTplName, setNewDayTplName] = useState("");
  const [selectedDayTplId, setSelectedDayTplId] = useState<string | null>(null);

  const handleCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    onCreateProject(name);
    setNewProjectName("");
  };

  const handleProjectClick = (projectId: string) => {
    onSetCurrentProjectId(projectId);
    onSetView("project");
  };

  const handleViewClick = (view: View) => {
    onSetView(view);
  };

  const handleTemplateClick = (templateId: string) => {
    onUseTemplate(templateId);
  };
  const handleDayTemplateOpen = (templateId: string) => {
    setSelectedDayTplId(templateId);
  };
  const handleApplyDayTemplate = (templateId: string, dateOverride?: string) => {
    onUseDayTemplate(templateId, dateOverride);
  };
  const handleCreateDayTpl = () => {
    const name = newDayTplName.trim();
    if (!name) return;
    onCreateDayTemplate(name);
    setNewDayTplName("");
  };

  const handleDeleteTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    onDeleteTemplate(templateId);
  };

  // ? proje sil (confirm ile)
  const handleDeleteProject = (
    e: React.MouseEvent,
    projectId: string,
    projectName: string
  ) => {
    e.stopPropagation();
    onDeleteProject(projectId);
  };

  const isCreateDisabled = newProjectName.trim().length === 0;

  return (
    <>
    <div
      className={`fixed left-0 top-0 h-full w-80
        border-r border-gray-700 z-50
        bg-gray-900
        shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col overflow-hidden
        transform transition-transform duration-300 will-change-transform
        ${isExpanded ? "translate-x-0" : "-translate-x-full"}`}
    >
      {/* collapsed controls moved outside to hide rail completely */}
      {/* toggle header (visible when expanded) */}
      {isExpanded && (
        <div className="p-2">
          <Button
            onClick={onToggle}
            className="w-full h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border-0"
            aria-label="Collapse sidebar"
            title="Collapse"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {isExpanded ? (
        <>
          {/* scrollable content (left-side scrollbar + modern styling) */}
          <div className="flex-1 overflow-hidden pr-4 pl-1 min-w-0">
            <div className="h-full overflow-y-auto space-y-4 scroll-left pretty-scroll scroll-modern pl-0">
              <div className="scroll-content space-y-4">
                {/* Projects Panel */}
                <Section title="Projects">
                  <div className="space-y-2">
                <Input
                  placeholder="New project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProject();
                  }}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  aria-label="New project name"
                />
                <Button
                  onClick={handleCreateProject}
                  disabled={isCreateDisabled}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                >
                  Create Project
                </Button>
              </div>

              <div className="space-y-2 mt-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-2 rounded text-white transition-colors group hover:bg-gray-700/80 cursor-pointer flex items-center justify-between"
                    onClick={() => handleProjectClick(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleProjectClick(project.id);
                      }
                    }}
                    aria-label={`Open project ${project.name}`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                        aria-hidden
                      />
                      <span className="truncate">{project.name}</span>
                    </div>

                    {/* delete project */}
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                      className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      title="Delete project"
                      aria-label={`Delete project ${project.name}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
                </Section>

                {/* Task Templates Panel */}
                <Section title="Task Templates">
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {templates.length > 0 ? (
                      templates.map((template) => (
                        <div
                          key={template.id}
                          onClick={() => handleTemplateClick(template.id)}
                          className="p-2 text-sm text-gray-300 rounded hover:bg-gray-700/80 cursor-pointer flex justify-between items-center group transition-colors"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleTemplateClick(template.id);
                            }
                          }}
                          aria-label={`Use template ${template.name}`}
                        >
                          <span className="truncate">{template.name}</span>
                          <button
                            onClick={(e) => handleDeleteTemplate(e, template.id)}
                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete template"
                            aria-label={`Delete template ${template.name}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 px-2">No templates yet.</p>
                    )}
                  </div>
                </Section>

                {/* Day Templates Panel */}
                <Section title="Day Templates">
                  {/* List view */}
                  {!selectedDayTplId ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="New day template name"
                          value={newDayTplName}
                          onChange={(e) => setNewDayTplName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCreateDayTpl(); }}
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                        <Button
                          onClick={handleCreateDayTpl}
                          disabled={newDayTplName.trim().length === 0}
                          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Add
                        </Button>
                      </div>
                      <div className="rounded-md border border-gray-700 bg-gray-800 overflow-hidden max-h-48 overflow-y-auto divide-y divide-gray-700">
                        {dayTemplates.length > 0 ? (
                          dayTemplates.map((tpl) => (
                            <div
                              key={tpl.id}
                              onClick={() => { onSetCurrentDayTemplateId(tpl.id); onSetView("day-template"); }}
                              className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/60 cursor-pointer flex items-center justify-between gap-2"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { onSetCurrentDayTemplateId(tpl.id); onSetView("day-template"); } }}
                              aria-label={`Open day template ${tpl.name}`}
                            >
                              <span className="truncate">{tpl.name}</span>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleApplyDayTemplate(tpl.id)}
                                  className="h-7 px-2 text-xs rounded bg-green-600 hover:bg-green-700 text-white"
                                  title="Apply to selected day"
                                  aria-label="Apply to selected day"
                                >
                                  Apply
                                </button>
                                <button
                                  onClick={() => onDeleteDayTemplate(tpl.id)}
                                  className="text-gray-500 hover:text-red-500"
                                  title="Delete day template"
                                  aria-label={`Delete day template ${tpl.name}`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 px-3 py-2">No day templates yet.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Detail view
                    <DayTemplateDetail
                      template={dayTemplates.find((t) => t.id === selectedDayTplId)!}
                      onBack={() => setSelectedDayTplId(null)}
                      onApply={() => onUseDayTemplate(selectedDayTplId)}
                      onDelete={() => { onDeleteDayTemplate(selectedDayTplId); setSelectedDayTplId(null); }}
                      onUpdate={onUpdateDayTemplate}
                    />
                  )}
                </Section>
              </div>
            </div>
          </div>

          {/* bottom actions (restored original style) */}
          <div className="p-4 border-t border-gray-700 space-y-2">
            <Button
              onClick={() => handleViewClick("tasks")}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white text-left"
            >
              All Tasks
            </Button>
            <Button
              onClick={() => handleViewClick("settings")}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
            >
              <SettingsIcon className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </>
      ) : (
        // collapsed: content hidden; controls live on slim rail above
        <div className="flex-1" />
      )}
    </div>
    {!isExpanded && (
      <button
        type="button"
        onClick={onToggle}
        className="fixed top-1/2 -translate-y-1/2 left-0 ml-0.5 h-10 w-6 z-50 flex items-center justify-center rounded-r-md border border-gray-700 bg-gray-800 text-white shadow"
        aria-label="Expand sidebar"
        title="Expand"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    )}
    </>
  );
};

// Local section shell mirroring RightPanel styling
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/60">
      <div className="px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DayTemplateDetail({
  template,
  onBack,
  onApply,
  onDelete,
  onUpdate,
}: {
  template: DayTemplate;
  onBack: () => void;
  onApply: () => void;
  onDelete: () => void;
  onUpdate: (updated: DayTemplate) => void;
}) {
  const [name, setName] = useState(template.name);
  const [weekdays, setWeekdays] = useState<number[]>(template.when.weekdays ?? []);

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const save = () => {
    onUpdate({ ...template, name: name.trim() || template.name, when: { ...template.when, weekdays: weekdays.sort((a,b)=>a-b) } });
  };

  const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button onClick={onBack} className="h-8 px-3 bg-gray-700 hover:bg-gray-600 text-white">Back</Button>
        <div className="text-sm text-white font-semibold">Edit Day Template</div>
        <div className="ml-auto flex gap-2">
          <Button onClick={onApply} className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white">Apply</Button>
          <Button onClick={onDelete} className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white">Delete</Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-400">Weekdays</div>
        <div className="grid grid-cols-7 gap-1">
          {dayLabels.map((lbl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { toggleWeekday(i); }}
              onBlur={() => save()}
              className={`h-8 rounded text-sm ${weekdays.includes(i) ? "bg-green-600 text-white" : "bg-gray-700 text-gray-200 hover:bg-gray-600"}`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500">Task editing for this template can be added later.</div>
    </div>
  );
}
