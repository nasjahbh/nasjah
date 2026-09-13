import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  // If already running as an installed standalone PWA, or already installed, hide completely
  if (isInstalled || installedSuccessfully) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        setInstalledSuccessfully(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <button
      onClick={handleInstallClick}
      disabled={installing}
      className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-[#25493D] hover:bg-[#2E584A] text-[#E8D5A8] border border-[#C7B895]/30 shadow-xs transition-all active:scale-95 disabled:opacity-75 cursor-pointer ${className}`}
      title="تثبيت تطبيق 'نَسْجَة' على جهازك"
    >
      <Download className={`w-4 h-4 text-[#E8D5A8] ${installing ? 'animate-bounce' : ''}`} />
    </button>
  );
};


