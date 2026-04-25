'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useToast } from '@/components/Toast/ToastProvider';

// ── Types ──────────────────────────────────────────────────────────────

export interface CalendarJob {
  _id: string;
  title: string;
  customerName: string;
  scheduledDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  status: string;
  total: number;
}

interface Props {
  initialYear: number;
  initialMonth: number;
  initialJobs: CalendarJob[];
  initialUnscheduled: CalendarJob[];
}

// ── Date helpers ───────────────────────────────────────────────────────

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const DAY_HEADING_FMT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayYMD(): string {
  return toYMD(new Date());
}

/** Build 42-cell (6×7) grid starting from the Sunday on/before the 1st */
function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month - 1, 1);
  const startSunday = new Date(first);
  startSunday.setDate(first.getDate() - first.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(startSunday.getFullYear(), startSunday.getMonth(), startSunday.getDate() + i));
  }
  return cells;
}

/** Dates for the week (Sun–Sat) that contains today */
function buildWeekStrip(): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i));
  }
  return days;
}

/** Group jobs by YYYY-MM-DD key derived from scheduledDate */
function groupByDate(jobs: CalendarJob[]): Map<string, CalendarJob[]> {
  const map = new Map<string, CalendarJob[]>();
  for (const job of jobs) {
    if (!job.scheduledDate) continue;
    const key = job.scheduledDate.slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(job);
    map.set(key, arr);
  }
  return map;
}

function formatTimeBlock(start: string | null, end: string | null): string {
  if (!start) return 'All Day';
  if (!end) return start;
  return `${start} – ${end}`;
}

function sortJobsByTime(jobs: CalendarJob[]): CalendarJob[] {
  return [...jobs].sort((a, b) => {
    if (!a.scheduledStart && !b.scheduledStart) return 0;
    if (!a.scheduledStart) return 1;
    if (!b.scheduledStart) return -1;
    return a.scheduledStart.localeCompare(b.scheduledStart);
  });
}

// ── Dot-only subcomponent ──────────────────────────────────────────────

function JobDots({ jobs }: { jobs: CalendarJob[] }) {
  if (jobs.length === 0) return null;
  const shown = jobs.slice(0, 3);
  const extra = jobs.length - 3;
  return (
    <div className="day-cell__dots">
      {shown.map((j) => (
        <span key={j._id} className="day-dot" data-status={j.status} />
      ))}
      {extra > 0 && <span className="day-cell__more">+{extra}</span>}
    </div>
  );
}

// ── Unscheduled card ───────────────────────────────────────────────────

function UnscheduledCard({
  job,
  onScheduled,
}: {
  job: CalendarJob;
  onScheduled: (jobId: string, date: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: val }),
      });
      if (!res.ok) throw new Error('Failed');
      onScheduled(job._id, val);
      toast.success(`${job.title} scheduled.`);
      setShowPicker(false);
    } catch {
      toast.error('Failed to schedule job.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="unscheduled-card glass-card">
      <div className="unscheduled-card__info">
        <span className="unscheduled-card__title">{job.title || 'Untitled'}</span>
        <span className="unscheduled-card__meta">
          {job.customerName}
          {job.total > 0 ? ` · ${formatCurrency(job.total)}` : ''}
        </span>
      </div>
      {showPicker ? (
        <input
          type="date"
          className="unscheduled-card__date-input"
          onChange={handleDateChange}
          disabled={busy}
          autoFocus
        />
      ) : (
        <button
          className="unscheduled-card__schedule-btn"
          onClick={() => setShowPicker(true)}
          disabled={busy}
        >
          Schedule
        </button>
      )}
    </div>
  );
}

// ── CalendarClient ─────────────────────────────────────────────────────

export default function CalendarClient({
  initialYear,
  initialMonth,
  initialJobs,
  initialUnscheduled,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const today = todayYMD();
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [jobs, setJobs] = useState<CalendarJob[]>(initialJobs);
  const [unscheduled, setUnscheduled] = useState<CalendarJob[]>(initialUnscheduled);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Drag state
  const [dragging, setDragging] = useState<{ jobId: string; title: string } | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef<{ jobId: string; title: string } | null>(null);

  // Keep ref in sync for pointer handlers
  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  // ── Data fetching ────────────────────────────────────────────────────

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?year=${y}&month=${m}`);
      if (res.ok) {
        const data = (await res.json()) as {
          jobs: CalendarJob[];
          unscheduled: CalendarJob[];
        };
        setJobs(data.jobs);
        setUnscheduled(data.unscheduled);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function prev() {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    setYear(newYear);
    setMonth(newMonth);
    void fetchMonth(newYear, newMonth);
  }

  function next() {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    setYear(newYear);
    setMonth(newMonth);
    void fetchMonth(newYear, newMonth);
  }

  function goToday() {
    if (year !== nowYear || month !== nowMonth) {
      setYear(nowYear);
      setMonth(nowMonth);
      void fetchMonth(nowYear, nowMonth);
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────

  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const weekDays = useMemo(() => buildWeekStrip(), []);
  const jobMap = useMemo(() => groupByDate(jobs), [jobs]);

  const monthLabel = MONTH_FMT.format(new Date(year, month - 1, 1));

  // ── Drag-to-reschedule ────────────────────────────────────────────────

  function startLongPress(jobId: string, title: string, e: React.PointerEvent) {
    e.preventDefault();
    longPressTimerRef.current = setTimeout(() => {
      setDragging({ jobId, title });
      setDragPos({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function onDragPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  async function onDragPointerUp(e: React.PointerEvent) {
    if (!dragging) {
      cancelLongPress();
      return;
    }

    // Find the day cell under the pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest('[data-date]') as HTMLElement | null;
    const newDate = cell?.dataset.date ?? null;

    const captured = dragging;
    setDragging(null);

    if (!newDate) return;

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) =>
        j._id === captured.jobId ? { ...j, scheduledDate: newDate } : j,
      ),
    );
    setSelectedDate(null);

    try {
      const res = await fetch(`/api/jobs/${captured.jobId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: newDate }),
      });
      if (!res.ok) throw new Error('Failed');
      const formatted = DAY_HEADING_FMT.format(new Date(newDate + 'T12:00:00'));
      toast.success(`Job rescheduled to ${formatted}.`);
    } catch {
      // Revert
      setJobs((prev) =>
        prev.map((j) =>
          j._id === captured.jobId ? { ...j, scheduledDate: null } : j,
        ),
      );
      toast.error('Failed to reschedule job.');
    }
  }

  // ── Day sheet ─────────────────────────────────────────────────────────

  const selectedJobs = useMemo(
    () => (selectedDate ? sortJobsByTime(jobMap.get(selectedDate) ?? []) : []),
    [selectedDate, jobMap],
  );

  const selectedHeading = selectedDate
    ? DAY_HEADING_FMT.format(new Date(selectedDate + 'T12:00:00'))
    : '';

  function handleScheduleJobCta() {
    if (selectedDate) {
      try {
        sessionStorage.setItem('verityflow_prefill_scheduled_date', selectedDate);
      } catch {
        // sessionStorage unavailable
      }
    }
    router.push('/jobs/new/voice');
  }

  // ── Unscheduled handler ───────────────────────────────────────────────

  function handleUnscheduled(jobId: string, date: string) {
    setUnscheduled((prev) => prev.filter((j) => j._id !== jobId));
    // Re-fetch to pick up the newly scheduled job in the grid
    void fetchMonth(year, month);
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      className="calendar-page"
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
      onPointerCancel={() => setDragging(null)}
    >
      {/* Header */}
      <header className="calendar-header">
        <button className="calendar-nav-btn" onClick={prev} aria-label="Previous month">
          <ChevronLeft size={24} />
        </button>
        <h1 className="calendar-title">{loading ? '…' : monthLabel}</h1>
        <button className="calendar-nav-btn" onClick={next} aria-label="Next month">
          <ChevronRight size={24} />
        </button>
        <button className="calendar-today-btn" onClick={goToday}>
          Today
        </button>
      </header>

      {/* Week strip */}
      <div className="week-strip">
        {weekDays.map((d) => {
          const key = toYMD(d);
          const isToday = key === today;
          const hasJobs = (jobMap.get(key)?.length ?? 0) > 0;
          return (
            <button
              key={key}
              className={`week-day-bubble${isToday ? ' is-today' : ''}`}
              onClick={() => setSelectedDate(key)}
              aria-label={key}
            >
              <span className="week-day-bubble__letter">{DAY_LETTERS[d.getDay()]}</span>
              <span className="week-day-bubble__num">{d.getDate()}</span>
              {hasJobs && <span className="week-day-bubble__dot" />}
            </button>
          );
        })}
      </div>

      {/* Month grid */}
      <div className="month-grid-wrapper">
        <div className="month-grid">
          {/* Day-of-week headers */}
          {DAY_LETTERS.map((l, i) => (
            <div key={i} className="month-grid__dow">{l}</div>
          ))}

          {/* Day cells */}
          {grid.map((d) => {
            const key = toYMD(d);
            const isCurrentMonth = d.getMonth() === month - 1;
            const isToday = key === today;
            const dayJobs = jobMap.get(key) ?? [];

            let cellCls = 'day-cell';
            if (!isCurrentMonth) cellCls += ' is-other-month';
            if (isToday) cellCls += ' is-today';
            if (dragging) cellCls += ' is-drop-target';

            return (
              <div
                key={key}
                className={cellCls}
                data-date={key}
                onClick={() => {
                  if (!dragging) setSelectedDate(key);
                }}
              >
                <span className="day-cell__num">{d.getDate()}</span>
                <JobDots jobs={dayJobs} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled section */}
      {unscheduled.length > 0 && (
        <section className="unscheduled-section">
          <div className="unscheduled-section__head">
            <h2 className="unscheduled-section__title">Unscheduled Jobs</h2>
            <Link href="/jobs?status=complete" className="unscheduled-section__seeall">
              See all
            </Link>
          </div>
          {unscheduled.map((job) => (
            <UnscheduledCard
              key={job._id}
              job={job}
              onScheduled={handleUnscheduled}
            />
          ))}
        </section>
      )}

      {/* Day detail bottom sheet */}
      {selectedDate !== null && (
        <>
          <div
            className="day-sheet-overlay"
            onClick={() => setSelectedDate(null)}
          />
          <div className={`day-sheet day-sheet--visible`}>
            <div className="day-sheet__handle" />
            <div className="day-sheet__head">
              <h2 className="day-sheet__title">{selectedHeading}</h2>
              <button className="day-sheet__cta" onClick={handleScheduleJobCta}>
                Schedule Job +
              </button>
            </div>
            <div className="day-sheet__body">
              {selectedJobs.length === 0 ? (
                <p className="day-sheet__empty">
                  Nothing scheduled. Tap + to add a job.
                </p>
              ) : (
                selectedJobs.map((job) => (
                  <DaySheetJobCard
                    key={job._id}
                    job={job}
                    isDragging={dragging?.jobId === job._id}
                    onStartDrag={startLongPress}
                    onCancelDrag={cancelLongPress}
                    onClick={() => router.push(`/jobs/${job._id}`)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Drag ghost */}
      {dragging && (
        <div
          className="drag-ghost"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <span className="drag-ghost__title">{dragging.title}</span>
          <span className="drag-ghost__sub">Drop to reschedule</span>
        </div>
      )}
    </div>
  );
}

// ── DaySheetJobCard ────────────────────────────────────────────────────

function DaySheetJobCard({
  job,
  isDragging,
  onStartDrag,
  onCancelDrag,
  onClick,
}: {
  job: CalendarJob;
  isDragging: boolean;
  onStartDrag: (jobId: string, title: string, e: React.PointerEvent) => void;
  onCancelDrag: () => void;
  onClick: () => void;
}) {
  const pointerDownRef = useRef(false);

  function handlePointerDown(e: React.PointerEvent) {
    pointerDownRef.current = true;
    onStartDrag(job._id, job.title, e);
  }

  function handlePointerUp() {
    pointerDownRef.current = false;
    onCancelDrag();
  }

  function handleClick() {
    if (!isDragging) onClick();
  }

  return (
    <div
      className={`day-sheet-job glass-card${isDragging ? ' is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={onCancelDrag}
      onClick={handleClick}
    >
      <span className="day-sheet-job__time">
        {formatTimeBlock(job.scheduledStart, job.scheduledEnd)}
      </span>
      <div className="day-sheet-job__info">
        <span className="day-sheet-job__title">{job.title || 'Untitled Job'}</span>
        {job.customerName && (
          <span className="day-sheet-job__customer">{job.customerName}</span>
        )}
      </div>
      <span className={`status-badge status-${job.status}`}>{job.status}</span>
    </div>
  );
}
