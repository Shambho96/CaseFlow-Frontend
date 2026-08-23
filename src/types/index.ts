// ─── Client Types ────────────────────────────────────────────────────────────

export type ClientType = 'individual' | 'company';

export interface Client {
  id: string;
  type: ClientType;
  name: string;
  firmName?: string;
  email: string;
  phone: string;
  address: string;
  tan?: string;
  pendingFees: number;
  caseIds: string[];
  createdAt: string;
}

// ─── Case Types ───────────────────────────────────────────────────────────────

export type CaseCategory =
  | 'Civil'
  | 'Criminal'
  | 'Constitutional'
  | 'Consumer'
  | 'Tax'
  | 'Arbitration'
  | 'Labour'
  | 'Family';

export type CaseStatus = 'Awaited' | 'Pending' | 'Decided' | 'Abandoned';

export type Empanelment = 'Insurance Panel' | 'Bank Panel' | 'Corporate Panel' | 'None';

export type CourtType =
  | 'High Court'
  | 'District Court'
  | 'NCLT'
  | 'Consumer Commission'
  | 'Supreme Court'
  | 'Tribunal';

export interface Hearing {
  id: string;
  caseId: string;
  date: string; // ISO date string
  purpose: string;
  court: string;
  courtNo: string;
  notes?: string;
}

export interface Case {
  id: string;
  caseNo: string;
  category: CaseCategory;
  status: CaseStatus;
  courtType: CourtType;
  courtName: string;
  courtNo: string;
  firstParty: string;
  oppositeParty: string;
  fixedFor: string;
  prevDate: string;
  nextDate: string;
  filedDate: string;
  stage: string;
  clientIds: string[];
  advocateIds: string[];
  docketRef?: string;
  judgeName?: string;
  // Extended identifiers (PRD 2.5)
  referenceNo?: string;
  fileNo?: string;
  fileName?: string;
  year?: string;
  companyName?: string;
  empanelment?: Empanelment;
  comments?: string;
  // Labels & custom fields
  labelIds?: string[];
  customFieldValues?: Record<string, string>;
  // Criminal specifics
  isCriminal?: boolean;
  firNo?: string;
  policeStation?: string;
  sections?: string;
  // Decision info
  decidedDate?: string;
  decisionSummary?: string;
  // Abandonment
  abandonedDate?: string;
  abandonReason?: string;
  notes?: string;
}

// ─── Task Types ───────────────────────────────────────────────────────────────

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  description: string;
  caseId?: string;
  clientId?: string;
  assignedTo: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

// ─── Advocate Types ───────────────────────────────────────────────────────────

export type AdvocateRole = 'Partner' | 'Associate' | 'Junior';

export interface Advocate {
  id: string;
  name: string;
  role: AdvocateRole;
  email: string;
  phone: string;
  barCouncilNo: string;
}

// ─── Document Types ───────────────────────────────────────────────────────────

export type DocumentCategory = 'General' | 'Case' | 'Client' | 'AI Draft';

export interface DocumentFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  caseId?: string;
  clientId?: string;
  category: DocumentCategory;
  parentId?: string;
  createdAt: string;
  url?: string;
  children?: DocumentFile[];
}

// ─── Calendar Types ───────────────────────────────────────────────────────────

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  caseId?: string;
  caseNo?: string;
  court: string;
  courtNo: string;
  fixedFor: string;
  colorKey: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'primary' | 'accent' | 'destructive';
}

// ─── Label & Custom Field Types ──────────────────────────────────────────────

export type LabelColor = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'primary';

export interface CaseLabel {
  id: string;
  name: string;
  color: LabelColor;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

export interface FilterState {
  status?: CaseStatus;
  courtType?: CourtType;
  courtName?: string;
  category?: CaseCategory;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeDecided?: boolean;
  onlyDecided?: boolean;
  onlyAwaited?: boolean;
  dateScope?: 'today' | 'tomorrow';
}

// ─── Scope Types ─────────────────────────────────────────────────────────────

export type ScopeKind = 'all' | 'advocate' | 'courtType' | 'court';

export interface ScopeFilter {
  kind: ScopeKind;
  value: string; // advocate id, court type, or court name
}

// ─── Notify Types ─────────────────────────────────────────────────────────────

export interface NotifyPayload {
  caseIds: string[];
  channel: 'whatsapp' | 'email' | 'both';
  message: string;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalCases: number;
  todayCases: number;
  tomorrowCases: number;
  awaitedCases: number;
  decidedCases: number;
}
