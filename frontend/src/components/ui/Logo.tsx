export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 3h8l1.6 5.2c.5 1.6.9 3.3.9 5V25a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V13.2c0-1.7.4-3.4.9-5L12 3Z"
          fill="#4f8038"
        />
        <path d="M12 3h8l1 3.2H11L12 3Z" fill="#325023" />
        <path d="M9.5 15.5c1.8 1 3.3 1 5 0s3.2-1 5 0" stroke="#f9ecce" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-ink-900">KS MILK</span>
    </div>
  );
}
