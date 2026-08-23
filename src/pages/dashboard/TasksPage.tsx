import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, Calendar, User, Briefcase, Trash2, Search, LayoutGrid, Table2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTasks } from '@/store/taskStore';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { useToast } from '@/store/toastStore';
import { useUI } from '@/store/uiStore';
import { formatDate, cn } from '@/lib/utils';
import { scopedCaseIdSet } from '@/lib/scope';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { advocates } from '@/mocks/advocates';

const COLUMNS: { id: TaskStatus; label: string; accent: string; hint: string }[] = [
  { id: 'Pending', label: 'Pending', accent: 'bg-chart-3', hint: 'Drop here to mark Pending' },
  { id: 'In Progress', label: 'In Progress', accent: 'bg-chart-4', hint: 'Drop here to mark In Progress' },
  { id: 'Completed', label: 'Completed', accent: 'bg-chart-1', hint: 'Drop here to mark Completed' },
];

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  High: 'bg-chart-3',
  Medium: 'bg-chart-4',
  Low: 'bg-muted-foreground',
};

function TaskCardInner({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onDelete,
  caseNo,
  clientName,
}: {
  task: Task;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  caseNo?: string;
  clientName?: string;
}) {
  const overdue = task.status !== 'Completed' && task.dueDate < new Date().toISOString().split('T')[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={cn(
          'bg-card border border-border rounded-[var(--radius-sm)] shadow-xs p-3 space-y-2.5 group cursor-grab active:cursor-grabbing select-none',
          'hover:shadow-sm hover:border-primary/40 transition-all',
          dragging && 'opacity-35 ring-2 ring-primary/40'
        )}
      >
        {/* Priority + drag handle */}
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_DOT[task.priority])} />
          <Badge variant={PRIORITY_STYLE[task.priority] as any} className="text-[10px]">{task.priority}</Badge>
          <div className="ml-auto text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity cursor-grab" title="Drag to move">
            <GripVertical size={13} />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs font-sans text-foreground leading-relaxed">{task.description}</p>

        {/* Meta */}
        <div className="space-y-1">
          {caseNo && (
            <div className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
              <Briefcase size={10} />
              <span className="font-mono text-primary">{caseNo}</span>
            </div>
          )}
          {clientName && (
            <div className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
              <User size={10} />
              {clientName}
            </div>
          )}
          <div className={cn('flex items-center gap-1.5 text-[10px] font-sans', overdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
            <Calendar size={10} />
            {overdue && <AlertCircle size={10} />}
            Due {formatDate(task.dueDate)}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
            <User size={10} />
            {task.assignedTo}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wide">Drag card to move</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
            aria-label="Delete task"
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function TasksPage() {
  const { tasks, addTask, deleteTask, moveTask } = useTasks();
  const { cases } = useCases();
  const { clients } = useClients();
  const { toast } = useToast();
  const { scope } = useUI();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [addOpen, setAddOpen] = useState(false);
  // Drag & drop state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    priority: 'Medium',
    status: 'Pending',
    assignedTo: 'Adv. Nikhil Joshi',
  });

  const isOverdue = (t: Task) => t.status !== 'Completed' && t.dueDate < new Date().toISOString().split('T')[0];

  // Scope-aware tasks: tasks without a linked case are always visible
  const scopedIds = useMemo(() => scopedCaseIdSet(cases, scope), [cases, scope]);
  const scopedTasks = useMemo(
    () => tasks.filter((t) => !t.caseId || scopedIds.has(t.caseId)),
    [tasks, scopedIds]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return scopedTasks;
    const q = search.toLowerCase();
    return scopedTasks.filter((t) =>
      t.description.toLowerCase().includes(q) ||
      (t.assignedTo && t.assignedTo.toLowerCase().includes(q))
    );
  }, [scopedTasks, search]);

  // Strict status isolation — each column renders ONLY its own status bucket
  const columnTasks = (status: TaskStatus) => filtered.filter((t) => t.status === status);

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus, label: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragTaskId;
    setOverCol(null);
    setDragTaskId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === targetStatus) return;
    moveTask(id, targetStatus);
    toast(`“${task.description.slice(0, 32)}${task.description.length > 32 ? '…' : ''}” moved to ${label}.`);
  };

  const handleAdd = () => {
    if (!newTask.description) return;
    addTask({
      id: `task-${Date.now()}`,
      description: newTask.description!,
      caseId: newTask.caseId,
      clientId: newTask.caseId ? cases.find((c) => c.id === newTask.caseId)?.clientIds[0] : undefined,
      assignedTo: newTask.assignedTo ?? 'Adv. Nikhil Joshi',
      priority: (newTask.priority as TaskPriority) ?? 'Medium',
      status: 'Pending',
      dueDate: newTask.dueDate ?? new Date().toISOString().split('T')[0],
      createdBy: 'Adv. Nikhil Joshi',
      createdAt: new Date().toISOString().split('T')[0],
      notes: newTask.notes,
    });
    setNewTask({ priority: 'Medium', status: 'Pending', assignedTo: 'Adv. Nikhil Joshi' });
    setAddOpen(false);
    toast('Task created.');
  };

  const caseById = (id?: string) => (id ? cases.find((c) => c.id === id) : null);
  const clientById = (id?: string) => (id ? clients.find((c) => c.id === id) : null);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Tasks & Reminders</h1>
          <p className="text-sm font-sans text-muted-foreground">
            {filtered.length} of {tasks.length} tasks · drag cards between columns to update status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[var(--radius-sm)] border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-sans transition-colors flex items-center gap-1',
                viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              <LayoutGrid size={12} /> Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-sans transition-colors flex items-center gap-1',
                viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              <Table2 size={12} /> Table
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-xs w-48"
              id="tasks-search"
            />
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus size={14} /> Add Task
          </Button>
        </div>
      </div>

      {/* Kanban board with drag & drop */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = columnTasks(col.id);
            const isOver = overCol === col.id && !!dragTaskId;
            return (
              <div key={col.id} className="flex flex-col gap-3">
                {/* Column header */}
                <div className="flex items-center gap-2 px-1">
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', col.accent)} />
                  <h3 className="font-sans font-semibold text-sm text-foreground">{col.label}</h3>
                  <Badge variant="muted" className="font-mono">{colTasks.length}</Badge>
                </div>

                {/* Drop zone — renders only this column's tasks */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (overCol !== col.id) setOverCol(col.id);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setOverCol((prev) => (prev === col.id ? null : prev));
                    }
                  }}
                  onDrop={(e) => handleDrop(e, col.id, col.label)}
                  className={cn(
                    'rounded-[var(--radius)] p-2 space-y-2 min-h-[320px] transition-all duration-150',
                    isOver
                      ? 'border-2 border-dashed border-primary bg-accent/50 shadow-inner'
                      : 'border-2 border-dashed border-transparent bg-muted/30'
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {colTasks.map((task) => (
                      <TaskCardInner
                        key={task.id}
                        task={task}
                        dragging={dragTaskId === task.id}
                        caseNo={caseById(task.caseId)?.caseNo}
                        clientName={clientById(task.clientId)?.name}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', task.id);
                          setDragTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDragTaskId(null);
                          setOverCol(null);
                        }}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </AnimatePresence>

                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-72 text-center px-4">
                      {isOver ? (
                        <>
                          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                            <Inbox size={16} className="text-primary" />
                          </div>
                          <p className="text-xs font-sans text-primary font-medium">{col.hint}</p>
                        </>
                      ) : (
                        <p className="text-xs font-sans text-muted-foreground">
                          {search ? 'No matching tasks.' : `No ${col.label.toLowerCase()} tasks.`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Drop affordance at list bottom while dragging into a populated column */}
                  {isOver && colTasks.length > 0 && (
                    <div className="border-2 border-dashed border-primary/60 rounded-[var(--radius-sm)] py-3 text-center bg-primary/5">
                      <p className="text-[11px] font-sans text-primary">{col.hint}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table view (PRD status board tabs) */}
      {viewMode === 'table' && (
        <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Case No.</TableHead>
                <TableHead>Parties</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center">
                    <p className="text-sm font-sans text-muted-foreground">No tasks found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => {
                  const linkedCase = t.caseId ? cases.find((c) => c.id === t.caseId) : null;
                  const linkedClient = t.clientId ? clients.find((c) => c.id === t.clientId) : null;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="text-xs font-sans text-foreground max-w-56 truncate">{t.description}</p>
                      </TableCell>
                      <TableCell>
                        {linkedCase ? (
                          <Link to={`/dashboard/cases/${linkedCase.id}`} className="font-mono text-xs text-primary hover:underline">
                            {linkedCase.caseNo}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-sans text-muted-foreground max-w-32 truncate block">
                          {linkedCase ? `${linkedCase.firstParty} v. ${linkedCase.oppositeParty}` : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-sans text-muted-foreground">{linkedClient?.name ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_STYLE[t.priority] as any} className="text-[10px]">{t.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-sans text-muted-foreground">{t.assignedTo}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-mono text-xs inline-flex items-center gap-1',
                          isOverdue(t) ? 'text-destructive font-semibold' : 'text-foreground'
                        )}>
                          {isOverdue(t) && <AlertCircle size={11} />}
                          {formatDate(t.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select value={t.status} onValueChange={(v) => moveTask(t.id, v as TaskStatus)}>
                          <SelectTrigger className="h-7 w-28 text-[10px] border-dashed"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {t.status !== 'Completed' && (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => moveTask(t.id, 'Completed')}>
                              ✓ Done
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { deleteTask(t.id); toast('Task deleted.', 'info'); }}
                            aria-label="Delete task"
                          >
                            <Trash2 size={11} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a new task and link it to a case or client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                placeholder="Draft written statement for CIV/2024/1123…"
                value={newTask.description ?? ''}
                onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask((p) => ({ ...p, priority: v as TaskPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={newTask.dueDate ?? ''} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={newTask.assignedTo ?? ''} onValueChange={(v) => setNewTask((p) => ({ ...p, assignedTo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {advocates.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link Case <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={newTask.caseId ?? ''} onValueChange={(v) => setNewTask((p) => ({ ...p, caseId: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="Select case…" /></SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.caseNo} — {c.firstParty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newTask.description}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
