export type Trade = {
  id: string;
  label: string;
  emoji: string;
  color: string;
};

export const TRADES: Trade[] = [
  { id: "plumber", label: "Plumber", emoji: "🔧", color: "#4A9EFF" },
  { id: "electrician", label: "Electrician", emoji: "⚡", color: "#FBBF24" },
  { id: "hvac", label: "HVAC Tech", emoji: "❄️", color: "#67E8F9" },
  { id: "roofer", label: "Roofer", emoji: "🏠", color: "#FB923C" },
  { id: "general", label: "General Contractor", emoji: "🏗️", color: "#A78BFA" },
  { id: "carpenter", label: "Carpenter", emoji: "🪵", color: "#D97706" },
  { id: "painter", label: "Painter", emoji: "🎨", color: "#34D399" },
  { id: "landscaper", label: "Landscaper", emoji: "🌿", color: "#4ADE80" },
  { id: "mason", label: "Mason & Concrete", emoji: "🧱", color: "#94A3B8" },
  { id: "welder", label: "Welder", emoji: "🔥", color: "#F87171" },
  { id: "appliance", label: "Appliance Repair", emoji: "🔌", color: "#60A5FA" },
  { id: "other", label: "Other Trade", emoji: "🛠️", color: "#9896A0" },
];

export type TeamSize = {
  id: string;
  label: string;
  sub: string;
};

export const TEAM_SIZES: TeamSize[] = [
  { id: "solo", label: "Solo — just me", sub: "I handle everything myself" },
  { id: "small", label: "Small Crew", sub: "2–5 people" },
  { id: "medium", label: "Growing Business", sub: "6–15 people" },
  { id: "large", label: "Established Company", sub: "15+ people" },
];

export type PainPoint = {
  id: string;
  label: string;
  emoji: string;
};

export const PAIN_POINTS: PainPoint[] = [
  { id: "invoicing", label: "Writing invoices takes forever", emoji: "📄" },
  { id: "memory", label: "Can't remember what I did at each job", emoji: "🧠" },
  { id: "chasing", label: "Chasing unpaid invoices", emoji: "💸" },
  { id: "parts", label: "Losing track of parts & materials", emoji: "🔩" },
  { id: "customers", label: "Losing customer info", emoji: "📱" },
  { id: "estimates", label: "Creating estimates takes too long", emoji: "🧮" },
];

export type ExperienceYears = {
  id: string;
  label: string;
  sub: string;
};

export const EXPERIENCE_YEARS: ExperienceYears[] = [
  { id: "0-2", label: "Just starting out", sub: "0–2 years" },
  { id: "3-7", label: "Getting established", sub: "3–7 years" },
  { id: "8-15", label: "Experienced pro", sub: "8–15 years" },
  { id: "15+", label: "Industry veteran", sub: "15+ years" },
];

export type JobType = {
  id: string;
  label: string;
  emoji: string;
};

export const JOB_TYPES: JobType[] = [
  { id: "residential", label: "Residential", emoji: "🏡" },
  { id: "commercial", label: "Commercial", emoji: "🏢" },
  { id: "both", label: "Both", emoji: "🔄" },
];
