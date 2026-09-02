'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { Trash2, Upload } from 'lucide-react';

import { cn } from '@/lib/cn';
import { deleteLocalFile, isImageFile, loadLocalFiles, saveLocalFile, type LocalFile } from '@/lib/media/localMedia';
import { LOCAL_THEME } from '@/lib/projector/themes';
import { useStudio } from '@/lib/studio/StudioProvider';

/**
 * Backgrounds from the operator's own machine.
 *
 * The picture stays in this browser: nothing is uploaded, which is why it costs
 * nothing to keep a whole service's worth of artwork. A projector on another
 * machine pulls the bytes from this console over WebRTC when the slide names
 * one — only the file's identity travels with the slide.
 */
export const LocalBackgrounds = () => {
  const { settings, setLocalBackground } = useStudio();
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let revoked: string[] = [];

    void loadLocalFiles()
      .then(stored => {
        const images = stored.filter(record => record.type.startsWith('image/'));

        setFiles(images);
        setUrls(
          Object.fromEntries(
            images.map(record => {
              const url = URL.createObjectURL(record.file);
              revoked.push(url);
              return [record.id, url];
            }),
          ),
        );
      })
      .catch(() => setFiles([]));

    return () => {
      revoked.forEach(url => URL.revokeObjectURL(url));
      revoked = [];
    };
  }, []);

  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(event.target.files ?? [])].filter(isImageFile);

    for (const file of picked) {
      const record = await saveLocalFile(file);

      setFiles(current => [...current, record]);
      setUrls(current => ({ ...current, [record.id]: URL.createObjectURL(record.file) }));
    }

    event.target.value = '';
  };

  const remove = async (record: LocalFile) => {
    await deleteLocalFile(record.id);

    setFiles(current => current.filter(item => item.id !== record.id));

    if (settings.localImage?.id === record.id) setLocalBackground(null);
  };

  const selected = settings.theme === LOCAL_THEME ? settings.localImage?.id : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm">Your own pictures</h2>

        <label className="border-studio-border text-studio-text hover:border-studio-faint flex cursor-pointer items-center gap-2 rounded-studio border px-2.5 py-1 text-xs transition hover:text-studio-text">
          <Upload className="size-3" />
          Add
          <input type="file" accept="image/*" multiple onChange={add} className="hidden" />
        </label>
      </div>

      <p className="text-studio-faint mt-1 text-xs">
        Kept on this computer, not uploaded. A projector on another machine fetches it from here.
      </p>

      {files.length === 0 ? null : (
        <div className="mt-3 grid grid-cols-6 gap-2">
          {files.map(record => (
            <div key={record.id} className="group relative">
              <button
                type="button"
                onClick={() => setLocalBackground(record)}
                title={record.name}
                className={cn(
                  'ring-offset-white h-12 w-full rounded bg-cover bg-center ring-offset-2 transition',
                  selected === record.id ? 'ring-studio-accent ring-2' : 'hover:ring-studio-border hover:ring-1',
                )}
                style={{ backgroundImage: urls[record.id] ? `url(${urls[record.id]})` : undefined }}
              />

              <button
                type="button"
                onClick={() => void remove(record)}
                aria-label={`Remove ${record.name}`}
                className="bg-white/80 text-studio-text hover:text-studio-danger absolute -top-1 -right-1 hidden rounded p-0.5 group-hover:block"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
