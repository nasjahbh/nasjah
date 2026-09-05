import React from 'react';

interface NasjahLogoProps {
  className?: string;
  variant?: 'full' | 'emblem' | 'icon' | 'mark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function NasjahLogo({ 
  className = '', 
  variant = 'full', 
  size = 'md',
  showText = true 
}: NasjahLogoProps) {
  // Dimension mapping
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  // When variant is 'icon' or 'emblem', we show the emblem badge
  if (variant === 'icon' || variant === 'emblem') {
    return (
      <div 
        className={`relative overflow-hidden rounded-2xl bg-[#183628] flex items-center justify-center shadow-xs border border-emerald-800/40 select-none ${sizeMap[size]} ${className}`}
        title="شعار نَسْجَة"
      >
        <img 
          src="/favicon.svg" 
          alt="شعار نَسْجَة" 
          className="w-full h-full object-contain p-0.5" 
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // When variant is 'mark', we show emblem + typography in a horizontal badge
  if (variant === 'mark') {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        <div className="w-9 h-9 rounded-xl bg-[#183628] p-1 flex items-center justify-center border border-emerald-800/50 shadow-xs flex-shrink-0">
          <img 
            src="/favicon.svg" 
            alt="أيقونة نَسْجَة" 
            className="w-full h-full object-contain" 
            referrerPolicy="no-referrer"
          />
        </div>
        {showText && (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider uppercase text-emerald-100 font-sans">
                نَسْجَة
              </span>
              <span className="text-[10px] bg-emerald-800/90 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                احترافي
              </span>
            </div>
            <p className="text-[10px] text-emerald-400 font-medium truncate">
              دار خياطة وتفصيل الأقمشة
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default 'full': The complete brand logo card
  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <img 
        src="/logo.svg" 
        alt="شعار نَسْجَة - NASJAH" 
        className="w-full h-auto max-w-[280px] rounded-3xl shadow-lg border border-emerald-800/30"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
