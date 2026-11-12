import React from 'react';
import { Modal } from './Modal';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => (
  <Modal open={open} onClose={onCancel} title={title}>
    <div className="mt-3 space-y-4">
      <p className="text-[12px] text-[#5c5954] leading-relaxed">{description}</p>
      <div className="flex justify-end gap-2">
        <SecondaryButton onClick={onCancel}>{cancelLabel}</SecondaryButton>
        <PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton>
      </div>
    </div>
  </Modal>
);

export default ConfirmDialog;
