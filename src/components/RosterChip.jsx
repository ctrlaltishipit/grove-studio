import ObserverInitials from './ObserverInitials';
import { isHere } from '../lib/presence';

// COUNTS ONLY. This component has no onClick, no title attribute carrying
// note text, and no expandable state. That is the independence invariant
// expressed in the UI layer. Do not add any of them.
export default function RosterChip({ person, isMe }) {
  const here = isHere(person);
  const n = person.note_count ?? 0;
  return (
    <div className={`chip${here ? '' : ' chip--away'}`}>
      <ObserverInitials name={person.display_name} colourIndex={person.colour_index} />
      <span className="chip__name">
        {person.display_name}{isMe ? ' (you)' : ''}
      </span>
      <span className="chip__count t-num">
        {n}
        <span className="sr-only"> {n === 1 ? 'note' : 'notes'}{here ? '' : ', away'}</span>
      </span>
    </div>
  );
}
