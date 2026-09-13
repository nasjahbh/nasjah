import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Check } from 'lucide-react';

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
      className={`inline-flex items-center gap-1.5 bg-[#1D3A30] hover:bg-[#25493D] text-[#E8D5A8] px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all border border-[#C7B895]/40 active:scale-95 disabled:opacity-75 ${className}`}
      title="تثبيت تطبيق دار نَسْجَة مباشرة على جهازك"
    >
      <Download className={`w-3.5 h-3.5 text-[#C7B895] ${installing ? 'animate-pulse' : ''}`} />
      <span>{installing ? 'جاري التثبيت...' : 'تثبيت التطبيق'}</span>
    </button>
  );
};

