
import type { LocalFileMeta } from '@/lib/types';

export type LocalFile = LocalFileMeta & { file: File | Blob; folder?: string };

export interface LocalFolder {
  id: string;
  name: string;
  position: number;
}

const DB_NAME = 'studioMedia';
const DB_VERSION = 3;
const STORE = 'files';
const FOLDERS = 'folders';

const RECEIVED = 'received';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      [STORE, RECEIVED, FOLDERS].forEach(name => {
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

export const saveLocalFile = async (file: File, folder?: string): Promise<LocalFile> => {
  const record: LocalFile = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    file,
    ...(folder ? { folder } : {}),
  };

  await run('readwrite', store => store.put(record));

  return record;
};

export const loadLocalFiles = () => run<LocalFile[]>('readonly', store => store.getAll());

export const loadLocalFile = (id: string) => run<LocalFile | undefined>('readonly', store => store.get(id));

export const deleteLocalFile = (id: string) => run<void>('readwrite', store => store.delete(id));

export const loadFolders = async (): Promise<LocalFolder[]> => {
  const folders = await run<LocalFolder[]>('readonly', store => store.getAll(), FOLDERS);

  return folders.sort((a, b) => a.position - b.position);
};

export const saveFolder = async (name: string): Promise<LocalFolder> => {
  const folders = await loadFolders();
  const folder: LocalFolder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    position: folders.length,
  };

  await run('readwrite', store => store.put(folder), FOLDERS);

  return folder;
};

export const renameFolder = async (id: string, name: string): Promise<void> => {
  const folders = await loadFolders();
  const folder = folders.find(item => item.id === id);

  if (folder) await run('readwrite', store => store.put({ ...folder, name }), FOLDERS);
};

export const deleteFolder = async (id: string): Promise<void> => {
  const files = await loadLocalFiles();

  await Promise.all(
    files.filter(file => file.folder === id).map(file => run('readwrite', store => store.put({ ...file, folder: undefined }))),
  );

  await run<void>('readwrite', store => store.delete(id), FOLDERS);
};

export const setFileFolder = async (id: string, folder?: string): Promise<void> => {
  const file = await loadLocalFile(id);

  if (file) await run('readwrite', store => store.put({ ...file, folder }));
};

export const saveReceivedFile = (record: LocalFile) =>
  run<void>('readwrite', store => store.put(record), RECEIVED);

export const loadReceivedFile = (id: string) =>
  run<LocalFile | undefined>('readonly', store => store.get(id), RECEIVED);

export const titleFromName = (name: string) => name.replace(/\.[^.]+$/, '');

export const isImageFile = (file: File) =>
  file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name);

export const isAudioFile = (file: File) =>
  file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus|webm)$/i.test(file.name);
