import React from 'react';

// Small line icons, drawn on a 24 grid, coloured by currentColor.
export const I = {
  pen: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  cursor: 'M5 3l14 7-6 2-2 6L5 3Z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  comment: 'M4 5h16v11H9l-5 4V5Z',
  at: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  list: 'M8 6h12M8 12h12M8 18h8M4 6h.01M4 12h.01M4 18h.01',
  slides: 'M3 4h18v12H3zM8 20h8M12 16v4',
  map: 'M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M5 5l5 5M19 5l-5 5M5 19l5-5M19 19l-5-5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  audio: 'M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2',
  board: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v7h-4z',
  task: 'M4 12l4 4L20 6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 11h9M18 11v3M21 11v2',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
};

export function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

