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
      className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all border border-emerald-700/50 active:scale-95 disabled:opacity-75 ${className}`}
      title="تثبيت تطبيق دار نَسْجَة مباشرة على جهازك"
    >
      <Download className={`w-3.5 h-3.5 text-amber-300 ${installing ? 'animate-pulse' : 'animate-bounce'}`} />
      <span>{installing ? 'جاري التثبيت...' : 'تثبيت التطبيق'}</span>
    </button>
  );
};

