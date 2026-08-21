// Grove — times are shown in IST, 24-hour. GROVE-MASTER.md §8.14, §7 S10.

export function istTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
