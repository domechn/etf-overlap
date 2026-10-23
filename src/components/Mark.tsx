/** The product mark: two overlapping circles, the overlap filled. Drawn in ink, currentColor. */
export const Mark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <clipPath id="mark-clip-a">
        <circle cx="9" cy="12" r="6.25" />
      </clipPath>
    </defs>
    <circle cx="9" cy="12" r="6.25" stroke="currentColor" strokeWidth="1.75" />
    <circle cx="15.5" cy="12" r="6.25" stroke="currentColor" strokeWidth="1.75" />
    <circle cx="15.5" cy="12" r="6.25" fill="currentColor" clipPath="url(#mark-clip-a)" />
  </svg>
);
