import React from 'react';

interface NccuLoopLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const NccuLoopLogo: React.FC<NccuLoopLogoProps> = ({
  size = 'sm',
  className = '',
}) => {
  const svgDimensions =
    size === 'lg' ? 'w-11 h-7' : size === 'md' ? 'w-9 h-6' : 'w-8 h-5';
  const textSize =
    size === 'lg'
      ? 'text-[11px] mt-1.5'
      : size === 'md'
        ? 'text-[10px] mt-1'
        : 'text-[9px] mt-0.5';

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* Interlocking Loops SVG (Minimalist geometric rounded loops) */}
      <svg
        viewBox="0 0 44 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={svgDimensions}
        aria-hidden="true"
      >
        {/* Left rounded loop */}
        <rect
          x="2.5"
          y="3.5"
          width="23"
          height="19"
          rx="9.5"
          stroke="#0F172A"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Right interlocking rounded loop */}
        <rect
          x="18.5"
          y="3.5"
          width="23"
          height="19"
          rx="9.5"
          stroke="#10B981"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Subtle over-under crossing segment to create true interlocking depth */}
        <path
          d="M19.2 6.4C21.3 4.6 24.0 3.5 27.0 3.5"
          stroke="#0F172A"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.18"
        />
        <path
          d="M16.0 22.5C19.2 22.5 22.0 21.1 23.8 18.8"
          stroke="#0F172A"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>

      {/* Wide-tracked minimal uppercase NCCU label */}
      <span
        className={`font-bold tracking-[0.25em] uppercase text-slate-600 leading-none ${textSize}`}
      >
        NCCU
      </span>
    </div>
  );
};
