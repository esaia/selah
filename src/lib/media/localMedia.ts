/**
 * Files the operator dragged in from their own machine.
 *
 * The file itself is kept in IndexedDB rather than uploaded anywhere: a
 * service's music is the church's, it is tens of megabytes, and the console
 * has to keep working when the hall's wifi does not. Storing the `File` keeps
 * it across reloads, so a track dropped on Saturday is still there on Sunday.
 *
 * Object URLs are deliberately *not* stored — a blob URL dies with the
 * document that made it, so they are minted fresh each session.
 */

import type { LocalFileMeta } from '@/lib/types';

/** A stored file: its identity, plus the bytes themselves. */
export type LocalFile = LocalFileMeta & { file: File | Blob };

const DB_NAME = 'studioMedia';
const DB_VERSION = 2;
const STORE = 'files';

/**
 * Files that arrived from *another* device over the peer connection, kept
 * apart from the ones this machine owns: a projector should not offer someone
 * else's background back as its own library, and a cached copy is disposable
 * in a way an operator's own file is not.
 */
const RECEIVED = 'received';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      [STORE, RECEIVED].forEach(name => {
        if (!request.result.objectStoreNames.contains(name)) {
          request.result.createObjectStore(name, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async <T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest,
  name: string = STORE,
): Promise<T> => {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(name, mode);
    const request = work(transaction.objectStore(name));

    transaction.oncomplete = () => resolve(request?.result as T);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

export const saveLocalFile = async (file: File): Promise<LocalFile> => {
  const record: LocalFile = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    file,
  };

  await run('readwrite', store => store.put(record));

  return record;
};

export const loadLocalFiles = () => run<LocalFile[]>('readonly', store => store.getAll());

export const loadLocalFile = (id: string) => run<LocalFile | undefined>('readonly', store => store.get(id));

export const deleteLocalFile = (id: string) => run<void>('readwrite', store => store.delete(id));

/**
 * The projector's copy of a background it was sent. Kept so a reload — or a
 * console that has since been closed — does not blank the screen: the picture
 * is already here, and the transfer only has to happen once.
 */
export const saveReceivedFile = (record: LocalFile) =>
  run<void>('readwrite', store => store.put(record), RECEIVED);

export const loadReceivedFile = (id: string) =>
  run<LocalFile | undefined>('readonly', store => store.get(id), RECEIVED);

/** Strips the extension, so the list reads like titles rather than filenames. */
export const titleFromName = (name: string) => name.replace(/\.[^.]+$/, '');

/** Everything an `<img>` will actually draw. */
export const isImageFile = (file: File) =>
  file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name);

/** Everything a `<audio>` element will actually play. */
export const isAudioFile = (file: File) =>
  file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus|webm)$/i.test(file.name);
