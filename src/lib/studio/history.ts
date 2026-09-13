export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_LIMIT = 100;

export const start = <T>(present: T): History<T> => ({ past: [], present, future: [] });

export const canUndo = <T>(history: History<T>) => history.past.length > 0;
export const canRedo = <T>(history: History<T>) => history.future.length > 0;

export const commit = <T>(history: History<T>, present: T, limit = HISTORY_LIMIT): History<T> =>
  present === history.present
    ? history
    : { past: [...history.past, history.present].slice(-limit), present, future: [] };

export const amend = <T>(history: History<T>, present: T): History<T> =>
  present === history.present ? history : { ...history, present, future: [] };

export const undo = <T>(history: History<T>): History<T> =>
  canUndo(history)
    ? {
        past: history.past.slice(0, -1),
        present: history.past[history.past.length - 1],
        future: [history.present, ...history.future],
      }
    : history;

export const redo = <T>(history: History<T>): History<T> =>
  canRedo(history)
    ? {
        past: [...history.past, history.present],
        present: history.future[0],
        future: history.future.slice(1),
      }
    : history;
