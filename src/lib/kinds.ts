// Grove — note kinds. GROVE-MASTER.md §8.5 (kind selector), §8.6 (note card meta).
// One list, shared by the composer's selector, the note card's meta row and
// device storage. No kind gets a colour — that would be a second semantic
// scale, which §4.1 forbids.
import type { NoteKind } from './models';

export interface KindOption {
  value: NoteKind;
  label: string;
}

export const KINDS: readonly KindOption[] = [
  { value: 'observation', label: 'Observation' },
  { value: 'quote',       label: 'Quote' },
  { value: 'question',    label: 'Question' },
];

/** The selector defaults to Observation. §8.5 */
export const DEFAULT_KIND: NoteKind = 'observation';

export function isKind(value: unknown): value is NoteKind {
  return KINDS.some((k) => k.value === value);
}

/** The visible label for a kind: "Observation" / "Quote" / "Question". */
export function kindLabel(kind: NoteKind): string {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}
