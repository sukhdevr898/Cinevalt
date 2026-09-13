import React, { useState } from 'react';
import { X, FolderPlus, CheckCircle2, AlertCircle, HelpCircle, HardDrive, Smartphone } from 'lucide-react';
import { api } from '../services/api';

interface AddFolderModalProps {
  onClose: () => void;
  onFolderAdded: () => void;
}

export const AddFolderModal: React.FC<AddFolderModalProps> = ({ onClose, onFolderAdded }) => {
  const [folderPath, setFolderPath] = useState('');
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);

  // Quick preset shortcuts
  const presets = [
    { label: 'Default Media Dir', path: './data/sample-media' },
    { label: 'Linux / Home Videos', path: '/home/' },
    { label: 'Windows Videos', path: 'C:\\Users\\Public\\Videos' },
    { label: 'Android Movies (Termux)', path: '/storage/emulated/0/Movies' },
    { label: 'Android Download (Termux)', path: '/storage/emulated/0/Download' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) {
      setError('Please enter or select a directory path.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const added = await api.addFolder(folderPath.trim(), folderName.trim() || undefined);
      // Auto trigger initial scan on newly added folder
      try {
        await api.scanFolder(added.id);
      } catch (scanErr: any) {
        console.warn('Initial folder scan notice:', scanErr);
      }
      onFolderAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add folder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#11131A] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E50914]/20 text-[#E50914]">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Local Media Folder</h2>
              <p className="text-xs text-[#A1A1AA]">Register a folder stored on this device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#71717A] hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-start space-x-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Folder Path (Absolute or Relative)
            </label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="e.g. /home/user/Movies or C:\Users\User\Videos"
              className="w-full rounded-xl border border-white/10 bg-[#181B24] px-3.5 py-2.5 font-mono text-sm text-white placeholder-[#71717A] focus:border-[#E50914] focus:outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Custom Display Name (Optional)
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Action Movies, Documentaries, Downloads"
              className="w-full rounded-xl border border-white/10 bg-[#181B24] px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] focus:border-[#E50914] focus:outline-none"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-medium text-[#71717A] mb-2">
              Common Folder Path Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.path}
                  type="button"
                  onClick={() => {
                    setFolderPath(p.path);
                    if (!folderName) setFolderName(p.label);
                  }}
                  className="rounded-lg border border-white/5 bg-[#181B24] px-2.5 py-1 text-[11px] text-[#A1A1AA] hover:bg-white/10 hover:text-white"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Android / Termux guidance toggle */}
          <div className="rounded-xl border border-white/5 bg-[#181B24] p-3 text-xs">
            <button
              type="button"
              onClick={() => setShowAndroidHelp(!showAndroidHelp)}
              className="flex w-full items-center justify-between font-medium text-[#A1A1AA] hover:text-white"
            >
              <span className="flex items-center space-x-1.5">
                <Smartphone className="h-4 w-4 text-[#E50914]" />
                <span>Running CineVault on Android (Termux)?</span>
              </span>
              <HelpCircle className="h-3.5 w-3.5" />
            </button>

            {showAndroidHelp && (
              <div className="mt-2.5 space-y-1 text-[11px] text-[#71717A] leading-relaxed border-t border-white/5 pt-2">
                <p>1. Grant storage permission: <code className="text-white">termux-setup-storage</code></p>
                <p>2. Access shared phone storage at: <code className="text-white">/storage/emulated/0/Movies</code></p>
                <p>3. Or your downloads folder: <code className="text-white">/storage/emulated/0/Download</code></p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#A1A1AA] hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 rounded-xl bg-[#E50914] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#E50914]/30 hover:bg-[#F6121D] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Validating...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Add & Scan Folder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
