import React from 'react';

interface LogoProps {
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
}

/**
 * Componente oficial del logotipo arquitectónico "GSARITAMA ARQ."
 * Proporción exacta 1000x230 basada en gsaritama001.jpg:
 * - Marco perimetral
 * - Letra G con media luna sólida a la izquierda y eje horizontal central
 * - Letra S entrelazada
 * - Letras A - R - I - T
 * - Compás con retícula/mira telescópica formando la letra A
 * - Letras M - A en la sección superior derecha
 * - Subtítulo A - R - Q . en la sección inferior derecha (A bajo el compás, R bajo la M, Q. bajo la A)
 */
export const LogoGSaritama: React.FC<LogoProps> = ({
  className = 'h-10 w-auto',
  theme = 'dark',
}) => {
  const colorClass =
    theme === 'dark'
      ? 'text-white'
      : theme === 'light'
      ? 'text-slate-900'
      : 'text-current';

  return (
    <div className={`inline-flex items-center shrink-0 ${colorClass}`}>
      <svg
        viewBox="0 0 1000 230"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} transition-transform select-none block`}
        aria-label="GSARITAMA ARQ."
      >
        {/* Marco perimetral rectangular */}
        <rect
          x="8"
          y="8"
          width="984"
          height="214"
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinejoin="miter"
        />

        {/* Eje horizontal continuo */}
        <line
          x1="125"
          y1="126"
          x2="980"
          y2="126"
          stroke="currentColor"
          strokeWidth="6.5"
          strokeLinecap="square"
        />

        {/* Monograma G con media luna sólida en el corte izquierdo */}
        <g id="letter-G">
          <path
            d="M 94 40
               A 88 88 0 0 0 94 212
               Z"
            fill="currentColor"
          />
          <path
            d="M 94 40
               A 88 88 0 0 1 185 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="square"
          />
          <path
            d="M 94 212
               A 88 88 0 0 0 185 212"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="square"
          />
          <line
            x1="94"
            y1="36"
            x2="94"
            y2="216"
            stroke="currentColor"
            strokeWidth="6"
          />
        </g>

        {/* Monograma S entrelazado */}
        <g id="letter-S">
          <path
            d="M 282 40
               C 246 38, 196 50, 190 78
               C 185 104, 206 116, 232 122
               C 264 130, 290 136, 290 158
               C 290 180, 264 194, 234 194
               C 202 194, 172 182, 164 158
               L 138 162
               C 146 198, 186 216, 234 216
               C 286 216, 318 190, 318 154
               C 318 126, 292 112, 260 105
               C 232 98, 214 91, 214 74
               C 214 59, 232 54, 252 54
               C 278 54, 300 65, 306 84
               L 332 78
               C 322 48, 294 40, 282 40 Z"
            fill="currentColor"
          />
        </g>

        {/* Letra A en ARIT */}
        <g transform="translate(325, 48)">
          <path
            d="M 46 0 L 10 148 L 28 148 L 38 102 L 78 102 L 88 148 L 106 148 Z
               M 58 26 L 72 82 L 44 82 Z"
            fill="currentColor"
          />
          <rect x="0" y="142" width="38" height="6" fill="currentColor" />
          <rect x="80" y="142" width="38" height="6" fill="currentColor" />
          <rect x="36" y="0" width="20" height="5" fill="currentColor" />
        </g>

        {/* Letra R */}
        <g transform="translate(435, 48)">
          <rect x="12" y="0" width="22" height="148" fill="currentColor" />
          <path
            d="M 28 0 L 65 0
               C 88 0, 104 14, 104 44
               C 104 74, 88 86, 65 86
               L 28 86 Z
               M 34 18 L 60 18
               C 74 18, 80 28, 80 44
               C 80 60, 74 68, 60 68
               L 34 68 Z"
            fill="currentColor"
          />
          <path d="M 54 82 L 90 148 L 116 148 L 76 78 Z" fill="currentColor" />
          <rect x="2" y="0" width="34" height="6" fill="currentColor" />
          <rect x="2" y="142" width="38" height="6" fill="currentColor" />
        </g>

        {/* Letra I */}
        <g transform="translate(545, 48)">
          <rect x="20" y="0" width="22" height="148" fill="currentColor" />
          <rect x="4" y="0" width="54" height="6" fill="currentColor" />
          <rect x="4" y="142" width="54" height="6" fill="currentColor" />
        </g>

        {/* Letra T */}
        <g transform="translate(605, 48)">
          <rect x="28" y="0" width="22" height="148" fill="currentColor" />
          <rect x="0" y="0" width="78" height="16" fill="currentColor" />
          <rect x="0" y="14" width="7" height="10" fill="currentColor" />
          <rect x="71" y="14" width="7" height="10" fill="currentColor" />
          <rect x="14" y="142" width="50" height="6" fill="currentColor" />
        </g>

        {/* Compás de arquitectura con mira concéntrica (Letra A en SARITAMA) */}
        <g id="compass" transform="translate(684, 16)">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="38"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle
            cx="0"
            cy="46"
            r="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
          />
          <circle
            cx="0"
            cy="46"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
          />
          <line
            x1="-38"
            y1="46"
            x2="38"
            y2="46"
            stroke="currentColor"
            strokeWidth="3.5"
          />
          <line
            x1="0"
            y1="12"
            x2="0"
            y2="80"
            stroke="currentColor"
            strokeWidth="3.5"
          />
          <circle cx="0" cy="46" r="5" fill="currentColor" />

          {/* Patas del compás */}
          <path
            d="M -6 52 
               L -56 182
               L -40 184
               L 0 68 Z"
            fill="currentColor"
          />
          <path
            d="M 6 52 
               L 56 182
               L 40 184
               L 0 68 Z"
            fill="currentColor"
          />

          <polygon points="-52,182 -56,182 -48,198" fill="currentColor" />
          <polygon points="52,182 56,182 48,198" fill="currentColor" />

          <rect
            x="-30"
            y="106"
            width="60"
            height="9"
            rx="3"
            fill="currentColor"
          />
          <line
            x1="-24"
            y1="110.5"
            x2="24"
            y2="110.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>

        {/* Letra M (Arriba a la derecha sobre el eje) */}
        <g transform="translate(750, 48)">
          <path
            d="M 0 0 L 26 0 L 52 74 L 78 0 L 104 0 L 104 78 L 84 78 L 84 26 L 62 78 L 42 78 L 20 26 L 20 78 L 0 78 Z"
            fill="currentColor"
          />
        </g>

        {/* Letra A (Arriba a la derecha sobre el eje) */}
        <g transform="translate(860, 48)">
          <path
            d="M 40 0 L 10 78 L 26 78 L 34 56 L 66 56 L 74 78 L 90 78 Z
               M 50 14 L 62 46 L 38 46 Z"
            fill="currentColor"
          />
          <rect x="2" y="74" width="28" height="4" fill="currentColor" />
          <rect x="70" y="74" width="28" height="4" fill="currentColor" />
        </g>

        {/* Subtítulo ARQ. debajo del eje */}
        {/* Letra A bajo el compás */}
        <g transform="translate(660, 134)">
          <path
            d="M 24 0 L 4 60 L 18 60 L 23 42 L 43 42 L 48 60 L 62 60 Z
               M 33 12 L 40 32 L 26 32 Z"
            fill="currentColor"
          />
        </g>

        {/* Letra R bajo la M */}
        <g transform="translate(760, 134)">
          <rect x="8" y="0" width="16" height="60" fill="currentColor" />
          <path
            d="M 22 0 L 44 0
               C 58 0, 68 7, 68 19
               C 68 31, 58 38, 44 38
               L 22 38 Z
               M 24 10 L 40 10
               C 48 10, 52 13, 52 19
               C 52 25, 48 28, 40 28
               L 24 28 Z"
            fill="currentColor"
          />
          <path d="M 36 34 L 60 60 L 76 60 L 50 32 Z" fill="currentColor" />
          <rect x="0" y="56" width="26" height="4" fill="currentColor" />
        </g>

        {/* Letra Q bajo la A con punto */}
        <g transform="translate(855, 134)">
          <path
            d="M 36 0
               C 16 0, 0 14, 0 31
               C 0 48, 16 62, 36 62
               C 56 62, 72 48, 72 31
               C 72 14, 56 0, 36 0 Z
               M 36 10
               C 48 10, 56 19, 56 31
               C 56 43, 48 52, 36 52
               C 24 52, 16 43, 16 31
               C 16 19, 24 10, 36 10 Z"
            fill="currentColor"
          />
          <path
            d="M 44 44
               C 52 44, 62 52, 74 60
               C 82 65, 88 68, 92 70
               C 88 72, 76 70, 64 62
               C 56 56, 48 50, 44 44 Z"
            fill="currentColor"
          />
          <circle cx="106" cy="56" r="6" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
};
