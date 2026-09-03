'use client';

import { Button, type ButtonProps } from '@/components/ui/Button';
import { Modal, useModalClose } from '@/components/ui/Modal';

/**
 * A yes/no gate in front of something that cannot be undone. The confirming
 * button carries the action's own wording, so the dialog reads as a sentence
 * rather than as an OK/Cancel pair.
 */
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
