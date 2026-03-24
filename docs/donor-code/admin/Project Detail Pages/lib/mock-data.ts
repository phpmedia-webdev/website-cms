export type TaskStatus = "todo" | "in-progress" | "review" | "done" | "blocked";
export type ProjectStatus = "new" | "active" | "complete";

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "critical";
  assignee: TeamMember;
  dueDate: string;
  estimatedHours: number;
  loggedHours: number;
}

export interface ProjectEvent {
  id: string;
  title: string;
  type: "meeting" | "deadline" | "review" | "demo" | "release";
  date: string;
  time: string;
  attendees: TeamMember[];
  location: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "expense" | "invoice" | "payment";
  date: string;
  category: string;
  status: "pending" | "approved" | "paid" | "rejected";
}

export interface Attachment {
  id: string;
  name: string;
  type: "pdf" | "image" | "doc" | "spreadsheet" | "figma" | "link";
  size: string;
  uploadedBy: TeamMember;
  uploadedAt: string;
  url: string;
}

export const teamMembers: TeamMember[] = [
  { id: "1", name: "Alex Rivera",  avatar: "/placeholder.svg?height=32&width=32", role: "Tech Lead" },
  { id: "2", name: "Sam Chen",     avatar: "/placeholder.svg?height=32&width=32", role: "Frontend Dev" },
  { id: "3", name: "Jordan Kim",   avatar: "/placeholder.svg?height=32&width=32", role: "Backend Dev" },
  { id: "4", name: "Morgan Lee",   avatar: "/placeholder.svg?height=32&width=32", role: "Designer" },
  { id: "5", name: "Taylor Patel", avatar: "/placeholder.svg?height=32&width=32", role: "QA Engineer" },
];

export const mockTeamMembers = teamMembers;

export const mockProject = {
  id: "PRJ-2024-001",
  title: "Horizon Design System",
  description:
    "A comprehensive, token-based design system built for scale. Includes component library, documentation site, Figma kit, and automated release tooling for cross-team adoption.",
  type: "Internal Platform",
  status: "active" as ProjectStatus,
  startDate: "Jan 6, 2025",
  endDate: "Apr 30, 2025",
  estimatedHours: 640,
  members: teamMembers,
};

export const mockTasks: Task[] = [
  {
    id: "T-001",
    title: "Design token architecture",
    description: "Define the full token hierarchy: primitives → semantics → components.",
    status: "done",
    priority: "critical",
    assignee: teamMembers[3],
    dueDate: "Feb 3, 2025",
    estimatedHours: 40,
    loggedHours: 38,
  },
  {
    id: "T-002",
    title: "Button component variants",
    description: "Build all button variants with states, sizes, and icon support.",
    status: "done",
    priority: "high",
    assignee: teamMembers[1],
    dueDate: "Feb 14, 2025",
    estimatedHours: 24,
    loggedHours: 26,
  },
  {
    id: "T-003",
    title: "Form components (Input, Select, Checkbox)",
    description: "Implement accessible form primitives with validation state handling.",
    status: "in-progress",
    priority: "high",
    assignee: teamMembers[1],
    dueDate: "Mar 10, 2025",
    estimatedHours: 48,
    loggedHours: 30,
  },
  {
    id: "T-004",
    title: "REST API integration layer",
    description: "Create service abstractions for design-token distribution API.",
    status: "in-progress",
    priority: "high",
    assignee: teamMembers[2],
    dueDate: "Mar 15, 2025",
    estimatedHours: 56,
    loggedHours: 20,
  },
  {
    id: "T-005",
    title: "Documentation site scaffold",
    description: "Set up Storybook + MDX docs with search and interactive playground.",
    status: "todo",
    priority: "medium",
    assignee: teamMembers[0],
    dueDate: "Mar 28, 2025",
    estimatedHours: 80,
    loggedHours: 0,
  },
  {
    id: "T-006",
    title: "Accessibility audit — Wave 1",
    description: "WCAG 2.2 AA audit on core components. File issues for any failures.",
    status: "review",
    priority: "critical",
    assignee: teamMembers[4],
    dueDate: "Mar 7, 2025",
    estimatedHours: 32,
    loggedHours: 32,
  },
  {
    id: "T-007",
    title: "Dark mode token mapping",
    description: "Map all semantic tokens to dark-mode equivalents and test contrast ratios.",
    status: "blocked",
    priority: "medium",
    assignee: teamMembers[3],
    dueDate: "Mar 20, 2025",
    estimatedHours: 20,
    loggedHours: 4,
  },
  {
    id: "T-008",
    title: "CI/CD pipeline for npm publish",
    description: "Automate versioning, changelogs, and package publishing on merge to main.",
    status: "todo",
    priority: "low",
    assignee: teamMembers[2],
    dueDate: "Apr 10, 2025",
    estimatedHours: 16,
    loggedHours: 0,
  },
  {
    id: "T-009",
    title: "Icon library integration",
    description: "Bundle Lucide icons as tree-shakeable design-system exports.",
    status: "todo",
    priority: "medium",
    assignee: teamMembers[1],
    dueDate: "Apr 4, 2025",
    estimatedHours: 12,
    loggedHours: 0,
  },
  {
    id: "T-010",
    title: "Figma kit — component sync",
    description: "Sync all coded components back to Figma via the Tokens Studio plugin.",
    status: "in-progress",
    priority: "high",
    assignee: teamMembers[3],
    dueDate: "Apr 18, 2025",
    estimatedHours: 30,
    loggedHours: 8,
  },
];

export const mockEvents: ProjectEvent[] = [
  {
    id: "E-001",
    title: "Sprint 5 Kickoff",
    type: "meeting",
    date: "Mar 24, 2025",
    time: "10:00 AM",
    attendees: teamMembers,
    location: "Zoom",
  },
  {
    id: "E-002",
    title: "Design System Review",
    type: "review",
    date: "Mar 28, 2025",
    time: "2:00 PM",
    attendees: [teamMembers[0], teamMembers[3]],
    location: "Conference Room A",
  },
  {
    id: "E-003",
    title: "Stakeholder Demo — v0.5",
    type: "demo",
    date: "Apr 4, 2025",
    time: "3:30 PM",
    attendees: [teamMembers[0], teamMembers[1], teamMembers[3]],
    location: "Board Room",
  },
  {
    id: "E-004",
    title: "Wave 1 Accessibility Deadline",
    type: "deadline",
    date: "Mar 7, 2025",
    time: "11:59 PM",
    attendees: [teamMembers[4]],
    location: "Remote",
  },
  {
    id: "E-005",
    title: "v1.0 Public Release",
    type: "release",
    date: "Apr 30, 2025",
    time: "9:00 AM",
    attendees: teamMembers,
    location: "Remote",
  },
];

export const mockTransactions: Transaction[] = [
  { id: "TXN-001", description: "Figma Enterprise License", amount: 1800, type: "expense", date: "Jan 10, 2025", category: "Software", status: "paid" },
  { id: "TXN-002", description: "Contractor — Accessibility Audit", amount: 4500, type: "invoice", date: "Feb 28, 2025", category: "Consulting", status: "approved" },
  { id: "TXN-003", description: "Cloud Hosting (Q1)", amount: 960, type: "expense", date: "Jan 1, 2025", category: "Infrastructure", status: "paid" },
  { id: "TXN-004", description: "Design System Sprint Budget", amount: 22000, type: "payment", date: "Jan 6, 2025", category: "Budget Allocation", status: "paid" },
  { id: "TXN-005", description: "Font Licensing — Variable Fonts", amount: 380, type: "expense", date: "Feb 5, 2025", category: "Assets", status: "paid" },
  { id: "TXN-006", description: "UX Research Sessions", amount: 2200, type: "invoice", date: "Mar 12, 2025", category: "Research", status: "pending" },
];

export const mockAttachments: Attachment[] = [
  {
    id: "ATT-001",
    name: "Design System Spec v1.2.pdf",
    type: "pdf",
    size: "3.4 MB",
    uploadedBy: teamMembers[3],
    uploadedAt: "Feb 20, 2025",
    url: "#",
  },
  {
    id: "ATT-002",
    name: "Token Architecture Diagram.png",
    type: "image",
    size: "1.1 MB",
    uploadedBy: teamMembers[0],
    uploadedAt: "Jan 22, 2025",
    url: "#",
  },
  {
    id: "ATT-003",
    name: "Component Audit Spreadsheet.xlsx",
    type: "spreadsheet",
    size: "220 KB",
    uploadedBy: teamMembers[4],
    uploadedAt: "Mar 5, 2025",
    url: "#",
  },
  {
    id: "ATT-004",
    name: "Horizon Figma Kit — Public",
    type: "figma",
    size: "—",
    uploadedBy: teamMembers[3],
    uploadedAt: "Feb 14, 2025",
    url: "#",
  },
  {
    id: "ATT-005",
    name: "A11y Audit Report.pdf",
    type: "pdf",
    size: "890 KB",
    uploadedBy: teamMembers[4],
    uploadedAt: "Mar 8, 2025",
    url: "#",
  },
  {
    id: "ATT-006",
    name: "API Documentation",
    type: "link",
    size: "—",
    uploadedBy: teamMembers[2],
    uploadedAt: "Feb 28, 2025",
    url: "#",
  },
];
