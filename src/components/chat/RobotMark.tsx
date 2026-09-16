import type { SVGProps } from "react";

export function RobotMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true" {...props}>
      <path d="M16 7V4M7 16H4M28 16h-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="3" r="2" fill="currentColor" />
      <rect x="7" y="8" width="18" height="18" rx="7" stroke="currentColor" strokeWidth="2.2" />
      <rect x="10" y="12" width="12" height="7" rx="3.5" fill="currentColor" fillOpacity=".2" />
      <path d="M12 15v2M20 15v2M13 22c2 1.5 4 1.5 6 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
