// Grove Studio — how a deadline is said out loud.
//
// §8's rule: overdue is carried by the words, never by a colour. A red card
// tells you something is wrong before you have read what it is, and on a
// board of ten tasks that is ten alarms and no information. "was due Tuesday"
// says the same thing and says it precisely.
//
// The clock is a parameter so the tests are not written at midnight.

export type DueBucket = 'none' | 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later';

const DAY = 86_400_000;

/** Midnight IST for a date, as a UTC instant. Grove's users are in one
 *  timezone; "today" means their today, not the server's. */
function istMidnight(d: Date): number {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3600_000;
}

export function dueBucket(dueDate: string | null, now: Date = new Date()): DueBucket {
  if (!dueDate) return 'none';
  const due = istMidnight(new Date(`${dueDate}T00:00:00+05:30`));
  const today = istMidnight(now);
  const days = Math.round((due - today) / DAY);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'soon';
  return 'later';
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The phrase shown on a card. Empty string when there is no date — a task
 *  without a deadline is a normal task, not a task missing something. */
export function duePhrase(dueDate: string | null, now: Date = new Date()): string {
  if (!dueDate) return '';
  const d = new Date(`${dueDate}T00:00:00+05:30`);
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const bucket = dueBucket(dueDate, now);
  const days = Math.round((istMidnight(d) - istMidnight(now)) / DAY);

  switch (bucket) {
    case 'today':    return 'due today';
    case 'tomorrow': return 'due tomorrow';
    case 'soon':     return `due ${WEEKDAY[ist.getUTCDay()]}`;
    case 'overdue':
      // Inside a week the weekday is the most useful handle a person has.
      // Beyond it, the count of days is, because "was due Tuesday" stops
      // meaning anything once several Tuesdays have gone by.
      if (days === -1) return 'was due yesterday';
      if (days >= -6)  return `was due ${WEEKDAY[ist.getUTCDay()]}`;
      return `was due ${Math.abs(days)} days ago`;
    default:
      return `due ${ist.getUTCDate()} ${MONTH[ist.getUTCMonth()]}`;
  }
}

/** Sort key for a dashboard: what is late first, then what is close. */
export function dueRank(dueDate: string | null, now: Date = new Date()): number {
  const order: Record<DueBucket, number> = { overdue: 0, today: 1, tomorrow: 2, soon: 3, later: 4, none: 5 };
  return order[dueBucket(dueDate, now)];
}

/** Today in IST as an ISO date, for the min= on a date input. */
export function todayIso(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  return ist.toISOString().slice(0, 10);
}
