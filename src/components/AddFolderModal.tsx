import React, { useState } from 'react';
import { X, FolderPlus, CheckCircle2, AlertCircle, HelpCircle, HardDrive, Smartphone, Youtube, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

interface AddFolderModalProps {
  onClose: () => void;
  onFolderAdded: () => void;
}

type TabType = 'local' | 'youtube' | 'gdrive';

export const AddFolderModal: React.FC<AddFolderModalProps> = ({ onClose, onFolderAdded }) => {
  const [activeTab, setActiveTab] = useState<TabType>('local');
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
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim()) {
      setError('Please enter a valid path or ID.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const added = await api.addFolder(folderPath.trim(), folderName.trim() || undefined, activeTab);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0B0D14] shadow-[0_0_80px_-20px_rgba(229,9,20,0.15)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-6 pb-4 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E50914]/10 text-[#E50914] shadow-inner shadow-[#E50914]/20">
              <FolderPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white font-['Manrope']">Add Media Source</h2>
              <p className="text-sm text-[#A1A1AA]">Register a new content source</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#71717A] hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-6 pb-0 space-x-2">
          <button
            type="button"
            onClick={() => { setActiveTab('local'); setFolderPath(''); setFolderName(''); setError(null); }}
            className={`flex flex-1 items-center justify-center space-x-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'local' ? 'bg-white/10 text-white shadow-sm' : 'text-[#71717A] hover:bg-white/5 hover:text-white'
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>Local</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('youtube'); setFolderPath(''); setFolderName(''); setError(null); }}
            className={`flex flex-1 items-center justify-center space-x-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'youtube' ? 'bg-[#ff0000]/20 text-[#ff0000] shadow-sm' : 'text-[#71717A] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Youtube className="h-4 w-4" />
            <span>YouTube</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('gdrive'); setFolderPath(''); setFolderName(''); setError(null); }}
            className={`flex flex-1 items-center justify-center space-x-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'gdrive' ? 'bg-[#0F9D58]/20 text-[#0F9D58] shadow-sm' : 'text-[#71717A] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Cloud className="h-4 w-4" />
            <span>Drive</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start space-x-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444] mt-0.5" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
              {activeTab === 'local' ? 'Folder Path (Absolute or Relative)' : activeTab === 'youtube' ? 'Playlist ID' : 'Google Drive Folder ID'}
            </label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder={activeTab === 'local' ? 'e.g. /home/user/Movies' : activeTab === 'youtube' ? 'e.g. PLj...' : 'e.g. 1aBcDeF...'}
              className="w-full rounded-xl border border-white/10 bg-[#151720] px-4 py-3 font-mono text-sm text-white placeholder-[#474752] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/50 focus:outline-none transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
              Custom Display Name (Optional)
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={activeTab === 'local' ? 'e.g. Action Movies' : activeTab === 'youtube' ? 'e.g. My Watch Later' : 'e.g. Shared Drive Videos'}
              className="w-full rounded-xl border border-white/10 bg-[#151720] px-4 py-3 text-sm text-white placeholder-[#474752] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/50 focus:outline-none transition-all"
            />
          </div>

          {/* Quick Presets */}
          {activeTab === 'local' && (
            <div>
              <span className="block text-[11px] font-medium text-[#71717A] mb-2">
                Common Folder Path Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => {
                      setFolderPath(p.path);
                      if (!folderName) setFolderName(p.label);
                    }}
                    className="rounded-lg border border-white/5 bg-[#151720] px-3 py-1.5 text-[11px] font-medium text-[#A1A1AA] hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-5 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[#A1A1AA] hover:bg-white/5 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 rounded-xl bg-[#E50914] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_-5px_rgba(229,9,20,0.5)] hover:bg-[#F6121D] hover:shadow-[0_0_25px_-5px_rgba(229,9,20,0.6)] disabled:opacity-50 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <span>Validating...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Add Source</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
