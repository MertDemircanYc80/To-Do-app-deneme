Day Templates (Scaffolding)

Goal: Click a fixed day template to auto-add that day’s tasks, without touching existing code paths yet.

What’s included
- Types and helpers in `lib/day-templates.ts` (not imported anywhere yet)
- Example JSON in `data/day-templates.sample.json`

Key concepts
- DayTemplate: `{ id, name, when: { weekdays?: number[], dates?: string[] }, tasks: TaskBlueprint[] }`
- TaskBlueprint: minimal task fields; `priority` defaults to `medium` on generation
- Storage key: `dayTemplates` via existing `dataUtils`

API
- `dayTemplateStore.getAll(userId)` / `saveAll(userId, list)`
- `appliesOn(date, tpl)` → boolean
- `generateTasksFor(date, tpl)` → array of task payloads (no id/completed/pinned)
- `applyDayTemplate(date, tpl, addTask, { dedupe?, existing? })` → adds tasks using your existing `addTask`
- `findApplicableTemplates(date, list)` → filter templates for a date

Suggested integration (later)
1) Load/Save (in `app/page.tsx` or a store)
   - On auth load: `const dayTemplates = dayTemplateStore.getAll(user.id)`
   - Persist on change: `dayTemplateStore.saveAll(user.id, dayTemplates)`

2) Sidebar section (UI)
   - New section “Day Templates” (similar to existing Templates)
   - List items → on click: `applyDayTemplate(selectedDate, tpl, addTask, { dedupe: true, existing: tasks })`

3) Auto-apply on date change (optional)
   - When `selectedDate` changes: find applicable templates and prompt user to add them
     Example:
     ```ts
     const tpls = findApplicableTemplates(selectedDate, dayTemplates);
     if (tpls.length) {
       // show confirm modal/toast, then:
       tpls.forEach((tpl) => applyDayTemplate(selectedDate, tpl, addTask, { dedupe: true, existing: tasks }));
     }
     ```

4) Duplicate protection
   - `applyDayTemplate` skips tasks that match same `(date + text)` by default. Pass `{ dedupe: false }` to disable.

5) Creating/Editing templates
   - Start by importing the sample JSON, or build simple CRUD around `dayTemplateStore`
   - Ids can be generated via `createId()`

6) Data shape example
   See `data/day-templates.sample.json` for Monday/Saturday and a one-off date.

Notes
- No existing files modified; this is safe scaffolding.
- Blueprint doesn’t include `recurring` to keep behavior predictable per-day.

