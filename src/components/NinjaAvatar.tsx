import React, { useEffect, useState } from 'react';

interface NinjaAvatarProps {
  src: string;
  alt: string;
  sizeClass?: string;
  onStatusChange?: (loaded: boolean) => void;
}

export const NinjaAvatar: React.FC<NinjaAvatarProps> = ({
  src,
  alt,
  sizeClass = 'w-11 h-11',
  onStatusChange,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        className={`${sizeClass} rounded-lg bg-[#0D1410] border border-[#10B981]/45 flex items-center justify-center shrink-0 overflow-hidden`}
        aria-label={alt}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#34D399]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3L19 12L12 21L5 12Z" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => {
        setFailed(false);
        onStatusChange?.(true);
      }}
      onError={() => {
        setFailed(true);
        onStatusChange?.(false);
      }}
      className={`${sizeClass} rounded-lg object-cover border border-[#10B981]/50 bg-[#0C120E] shrink-0`}
    />
  );
};
