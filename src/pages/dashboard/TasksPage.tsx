import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, Calendar, User, Briefcase, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTasks } from '@/store/taskStore';
import { useCases } from '@/store/caseStore';
import { useClients } from '@/store/clientStore';
import { formatDate, cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { advocates } from '@/mocks/advocates';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'Pending', label: 'Pending' },
  { id: 'In Progress', label: 'In Progress' },
  { id: 'Completed', label: 'Completed' },
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

function TaskCard({ task, onDelete, onMove }: { task: Task; onDelete: () => void; onMove: (status: TaskStatus) => void }) {
  const { cases } = useCases();
  const { clients } = useClients();
  const linkedCase = task.caseId ? cases.find((c) => c.id === task.caseId) : null;
  const linkedClient = task.clientId ? clients.find((c) => c.id === task.clientId) : null;
  const nextStatuses: TaskStatus[] = task.status === 'Pending' ? ['In Progress'] : task.status === 'In Progress' ? ['Completed', 'Pending'] : ['In Progress'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-card border border-border rounded-[var(--radius-sm)] shadow-xs p-3 space-y-2.5 group cursor-grab active:cursor-grabbing"
    >
      {/* Priority + drag handle */}
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_DOT[task.priority])} />
        <Badge variant={PRIORITY_STYLE[task.priority] as any} className="text-[10px]">{task.priority}</Badge>
        <div className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={13} />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs font-sans text-foreground leading-relaxed">{task.description}</p>

      {/* Meta */}
      <div className="space-y-1">
        {linkedCase && (
          <div className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
            <Briefcase size={10} />
            <Link to={`/dashboard/cases/${linkedCase.id}`} className="font-mono text-primary hover:underline">
              {linkedCase.caseNo}
            </Link>
          </div>
        )}
        {linkedClient && (
          <div className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
            <User size={10} />
            {linkedClient.name}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
          <Calendar size={10} />
          Due {formatDate(task.dueDate)}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-sans text-muted-foreground">
          <User size={10} />
          {task.assignedTo}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border">
        {nextStatuses.map((s) => (
          <Button key={s} variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-2" onClick={() => onMove(s)}>
            → {s}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          aria-label="Delete task"
        >
          <Trash2 size={11} />
        </Button>
      </div>
    </motion.div>
  );
}

export function TasksPage() {
  const { tasks, addTask, deleteTask, moveTask } = useTasks();
  const { cases } = useCases();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    priority: 'Medium',
    status: 'Pending',
    assignedTo: 'Adv. Nikhil Joshi',
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) =>
      t.description.toLowerCase().includes(q) ||
      (t.assignedTo && t.assignedTo.toLowerCase().includes(q))
    );
  }, [tasks, search]);

  const columnTasks = (status: TaskStatus) => filtered.filter((t) => t.status === status);

  const handleAdd = () => {
    if (!newTask.description) return;
    addTask({
      id: `task-${Date.now()}`,
      description: newTask.description!,
      caseId: newTask.caseId,
      clientId: newTask.clientId,
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
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Tasks & Reminders</h1>
          <p className="text-sm font-sans text-muted-foreground">{tasks.length} tasks across {COLUMNS.length} stages</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = columnTasks(col.id);
          return (
            <div key={col.id} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <h3 className="font-sans font-semibold text-sm text-foreground">{col.label}</h3>
                <Badge variant="muted" className="font-mono">{colTasks.length}</Badge>
              </div>

              {/* Cards */}
              <div className="bg-muted/30 rounded-[var(--radius)] p-2 space-y-2 min-h-[200px]">
                <AnimatePresence>
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={() => deleteTask(task.id)}
                      onMove={(s) => moveTask(task.id, s)}
                    />
                  ))}
                </AnimatePresence>
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-xs font-sans text-muted-foreground">
                      {search ? 'No matching tasks.' : `No ${col.label.toLowerCase()} tasks.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
