'use client';

import { useEffect } from 'react';

import { Button, type ButtonProps } from '@/components/ui/Button';
import { Modal, useModalClose } from '@/components/ui/Modal';

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  variant = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ButtonProps['variant'];
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const close = useModalClose();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') close.current?.(onConfirm);
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [close, onConfirm, open]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeRef={close}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button onClick={() => close.current?.()}>Cancel</Button>
          <Button variant={variant} onClick={() => close.current?.(onConfirm)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="py-1 text-sm leading-relaxed text-studio-muted">{message}</p>
    </Modal>
  );
};
