import type { ReactNode, SVGProps } from 'react';

const ICONS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3z" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 19l-7-7 7-7" />,
  arrowRight: <path d="M5 12h14M13 5l7 7-7 7" />,
  check: <path d="M20 6L9 17l-5-5" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </>
  ),
  play: <path d="M8 5.5l11 6.5-11 6.5v-13z" />,
  replay: <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3 4.5V10h5.5" />,
  home: <path d="M3 11l9-8 9 8M5 9.5V20h14V9.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  expand: <path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5" />,
  sparkles: (
    <>
      <path d="M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9L12 3z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.9A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4.1" />
      <path d="M6.6 7.5A17.3 17.3 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.4 3.7-.9" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5L6.5 9H3v6h3.5L11 19V5z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.3 6.7a8 8 0 0 1 0 10.6" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M11 5L6.5 9H3v6h3.5L11 19V5z" />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 17.5h5M10.5 21h3" />
      <path d="M12 3a6 6 0 0 0-3.4 10.9c.6.4 1 1.1 1 1.9v.7h4.8v-.7c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z" />
    </>
  ),
  map: (
    <>
      <path d="M9 3L3.5 5.7v14.6L9 17.6l6 2.7 5.5-2.7V2.9L15 5.6 9 3z" />
      <path d="M9 3v14.6M15 5.6v14.7" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.2 8.8l-2 5.4-5.4 2 2-5.4 5.4-2z" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.2" />
      <path d="M9.2 13.4L7.5 21l4.5-2.6L16.5 21l-1.7-7.6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7" />
      <path d="M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5" />
    </>
  ),
  chevronRight: <path d="M9 5l7 7-7 7" />,
  layers: (
    <>
      <path d="M12 3.5l8.5 4.6L12 12.7 3.5 8.1 12 3.5z" />
      <path d="M3.5 12.3l8.5 4.6 8.5-4.6M3.5 16.5l8.5 4.6 8.5-4.6" />
    </>
  ),
  flag: <path d="M5.5 21V4h12l-1.5 4 1.5 4h-12" />,
  rotate: <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1M21 4.5V10h-5.5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.8, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
}
