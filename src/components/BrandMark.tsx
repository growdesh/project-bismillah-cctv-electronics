import { useId } from "react";

export function BrandMark({ size = 40 }: { size?: number }) {
  const gradId = `bceBrandBg-${useId()}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${gradId})`} />
      <rect x="2.75" y="2.75" width="42.5" height="42.5" rx="12.25" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="11.5" stroke="#ffffff" strokeWidth="2.4" opacity="0.92" />
      <circle cx="24" cy="24" r="6" fill="#ecfdf5" fillOpacity="0.18" stroke="#a7f3d0" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="2.6" fill="#ffffff" />
      <circle cx="27.5" cy="20.5" r="1.4" fill="#6ee7b7" />
    </svg>
  );
}
