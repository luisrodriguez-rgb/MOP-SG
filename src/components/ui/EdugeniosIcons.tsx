'use client';

import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * 1. REPASAR (Rayo / Lightning)
 */
export function RepasarIcon({ size = 48, className = '', glow = true, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="repasarGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        {glow && (
          <filter id="repasarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="18" floodColor="#ef4444" floodOpacity="0.4" />
          </filter>
        )}
      </defs>
      <path
        d="M544 192 L320 544 H480 L448 832 L704 448 H544 Z"
        fill="url(#repasarGrad)"
        filter={glow ? 'url(#repasarGlow)' : undefined}
        stroke="#ffffff"
        strokeWidth="16"
        strokeLinejoin="round"
      />
      <path
        d="M532 230 L360 520 H490 L466 740 L640 468 H520 Z"
        fill="none"
        stroke="#ffccd5"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/**
 * 2. SIMULACRO (Clipboard / Examen)
 */
export function SimulacroIcon({ size = 48, className = '', glow = true, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="simulacroRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        {glow && (
          <filter id="simulacroGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#ef4444" floodOpacity="0.3" />
          </filter>
        )}
      </defs>
      <rect x="288" y="240" width="448" height="560" rx="48" fill="#1e1e24" stroke="#ffffff" strokeWidth="24" />
      <rect
        x="400"
        y="180"
        width="224"
        height="100"
        rx="24"
        fill="url(#simulacroRed)"
        filter={glow ? 'url(#simulacroGlow)' : undefined}
        stroke="#ffffff"
        strokeWidth="16"
      />
      <circle cx="512" cy="225" r="18" fill="#ffffff" />
      {/* Items */}
      <circle cx="384" cy="380" r="24" fill="url(#simulacroRed)" />
      <path d="M374 380 L382 388 L396 374" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="440" y="368" width="210" height="24" rx="12" fill="#ffffff" />

      <circle cx="384" cy="480" r="24" fill="url(#simulacroRed)" />
      <path d="M374 480 L382 488 L396 474" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="440" y="468" width="160" height="24" rx="12" fill="#ffffff" />

      <circle cx="384" cy="580" r="24" fill="url(#simulacroRed)" />
      <path d="M374 580 L382 588 L396 574" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="440" y="568" width="185" height="24" rx="12" fill="#ffffff" />

      <rect x="360" y="672" width="304" height="18" rx="9" fill="#353540" />
      <rect x="360" y="672" width="220" height="18" rx="9" fill="url(#simulacroRed)" />
    </svg>
  );
}

/**
 * 3. RETO DEL DÍA (Llama / Fuego)
 */
export function RetoDelDiaIcon({ size = 48, className = '', glow = true, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="flameOuter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="flameInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        {glow && (
          <filter id="flameGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="20" floodColor="#ef4444" floodOpacity="0.45" />
          </filter>
        )}
      </defs>
      <path
        d="M512 180 C440 290 320 420 320 580 C320 710 406 816 512 816 C618 816 704 710 704 580 C704 430 600 340 576 250 C540 330 490 370 490 370 C490 370 540 270 512 180 Z"
        fill="url(#flameOuter)"
        filter={glow ? 'url(#flameGlow)' : undefined}
        stroke="#ffffff"
        strokeWidth="18"
        strokeLinejoin="round"
      />
      <path
        d="M512 460 C480 520 416 590 416 670 C416 730 458 780 512 780 C566 780 608 730 608 670 C608 590 560 540 512 460 Z"
        fill="url(#flameInner)"
        stroke="#ffffff"
        strokeWidth="8"
      />
      <circle cx="650" cy="320" r="14" fill="#ff4d6d" stroke="#ffffff" strokeWidth="4" />
      <circle cx="360" cy="360" r="10" fill="#f97316" stroke="#ffffff" strokeWidth="3" />
    </svg>
  );
}

/**
 * 4. SALAS (Birrete / Sala Académica)
 */
export function SalasIcon({ size = 48, className = '', glow = true, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="salasRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        {glow && (
          <filter id="salasGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#ef4444" floodOpacity="0.35" />
          </filter>
        )}
      </defs>
      <polygon points="512,240 784,380 512,520 240,380" fill="#ffffff" stroke="#ffffff" strokeWidth="16" strokeLinejoin="round" />
      <path
        d="M340 450 L340 600 C340 690 417 760 512 760 C607 760 684 690 684 600 L684 450 L512 538 Z"
        fill="#1e1e26"
        stroke="#ffffff"
        strokeWidth="20"
        strokeLinejoin="round"
      />
      <path
        d="M360 590 C390 670 448 720 512 720 C576 720 634 670 664 590"
        fill="none"
        stroke="url(#salasRed)"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M512 380 L690 470 L690 650"
        fill="none"
        stroke="url(#salasRed)"
        strokeWidth="14"
        strokeLinecap="round"
        filter={glow ? 'url(#salasGlow)' : undefined}
      />
      <circle cx="512" cy="380" r="18" fill="url(#salasRed)" />
      <circle cx="690" cy="660" r="26" fill="url(#salasRed)" stroke="#ffffff" strokeWidth="8" filter={glow ? 'url(#salasGlow)' : undefined} />
    </svg>
  );
}

/**
 * 5. DESAFÍOS (Target / Diana)
 */
export function DesafiosIcon({ size = 48, className = '', glow = true, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="desafiosRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        {glow && (
          <filter id="desafiosGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="18" floodColor="#ef4444" floodOpacity="0.4" />
          </filter>
        )}
      </defs>
      <circle cx="512" cy="512" r="270" fill="none" stroke="#ffffff" strokeWidth="32" />
      <circle
        cx="512"
        cy="512"
        r="180"
        fill="none"
        stroke="url(#desafiosRed)"
        strokeWidth="28"
        filter={glow ? 'url(#desafiosGlow)' : undefined}
      />
      <circle
        cx="512"
        cy="512"
        r="90"
        fill="url(#desafiosRed)"
        stroke="#ffffff"
        strokeWidth="16"
        filter={glow ? 'url(#desafiosGlow)' : undefined}
      />
      <circle cx="512" cy="512" r="28" fill="#ffffff" />
      {/* Reticle lines */}
      <line x1="512" y1="170" x2="512" y2="270" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
      <line x1="512" y1="754" x2="512" y2="854" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
      <line x1="170" y1="512" x2="270" y2="512" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
      <line x1="754" y1="512" x2="854" y2="512" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 6. COMPONENTE GRID: 'Empieza ahora'
 * Recrea la barra interactiva exacta de la captura
 */
export function EmpiezaAhoraSection({ onSelect }: { onSelect?: (key: string) => void }) {
  const actions = [
    { key: 'repasar', label: 'Repasar', Icon: RepasarIcon },
    { key: 'simulacro', label: 'Simulacro', Icon: SimulacroIcon },
    { key: 'reto', label: 'Reto del día', Icon: RetoDelDiaIcon },
    { key: 'salas', label: 'Salas', Icon: SalasIcon },
    { key: 'desafios', label: 'Desafíos', Icon: DesafiosIcon },
  ];

  return (
    <div className="w-full py-4 select-none">
      <h3 className="text-white font-bold text-sm tracking-wide mb-3 px-1">Empieza ahora</h3>
      <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
        {actions.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onSelect?.(key)}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="w-full aspect-square max-w-[76px] rounded-2xl bg-[#151518] border border-[#26262d] flex items-center justify-center p-3 shadow-md transition-all duration-200 group-hover:scale-105 group-hover:border-[#ef4444]/60 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] group-active:scale-95">
              <Icon size={42} className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-neutral-300 text-center leading-tight transition-colors group-hover:text-white">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
