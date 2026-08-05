import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm,
  danger = false,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg shadow-xl p-6 text-[#d1d1d0]">
        <h2 className="text-xl font-bold mb-2 text-white">{title}</h2>
        <p className="mb-4 text-sm text-[#d1d1d0]/80">{description}</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#1a1a1a] hover:bg-white/10 text-[#d1d1d0] border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-full text-xs font-medium ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
