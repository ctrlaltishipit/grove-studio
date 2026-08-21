// Grove — finding id → the set of participant ids whose own notes supported it.
// Feeds the grid marks (GROVE-MASTER.md §8.12–8.13) and the map nodes (§8.23).
//
// v1 change from the reference build. The reference derived this map on the
// client from each finding's supporting_note_ids plus a note-id → owner map,
// which needs the owner of every note on the client. Under RLS a participant
// can read only their own notes during capture, so that map is incomplete for
// everyone but the note's author and the marks would be wrong for other
// readers. v1 instead takes the rows of the get_finding_observers() RPC —
// (finding_id, participant_id) pairs, ids only, never note text — which the
// server computes across lanes and which is therefore correct for every
// reader. No schema change, no new prompt; the ranking itself is still
// computed by Grove from note ids, never by the model.
//
// A finding with no rows has no entry; readers fall back with
// `supporters.get(id) || new Set()` exactly as the reference did.
import type { FindingObserver } from './models';

export function buildSupporters(rows: FindingObserver[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    let set = map.get(row.finding_id);
    if (!set) {
      set = new Set<string>();
      map.set(row.finding_id, set);
    }
    set.add(row.participant_id);
  }
  return map;
}
