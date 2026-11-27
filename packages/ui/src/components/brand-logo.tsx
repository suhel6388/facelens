import * as React from "react";
import { cn } from "../utils";

export interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
}

/**
 * Original FaceLens geometric aperture & privacy-frame mark.
 */
export function BrandLogo({ className, showWordmark = true }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="26"
          height="26"
          rx="8"
          fill="#151821"
          stroke="#252A35"
          strokeWidth="1.5"
        />
        <path
          d="M8.5 10.5V8.5H10.5M17.5 8.5H19.5V10.5M19.5 17.5V19.5H17.5M10.5 19.5H8.5V17.5"
          stroke="#6575FF"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="14" r="3.5" stroke="#E94B78" strokeWidth="1.75" />
      </svg>
      {showWordmark ? (
        <span className="text-base font-semibold tracking-tight text-white">FaceLens</span>
      ) : null}
    </span>
  );
}
