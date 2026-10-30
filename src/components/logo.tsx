import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 ${className}`} aria-label="WishBridge home">
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
        <defs>
          <linearGradient id="wb-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4826f" />
            <stop offset="1" stopColor="#e8664f" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="#3a2049" />
        <path d="M8 26c4-8 8-11 12-11s8 3 12 11" stroke="url(#wb-g)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M20 8.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L20 15.6l-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="#fbf7f0" />
        <path d="M12 26v4M28 26v4M20 22v8" stroke="#d6c2e0" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight text-plum-900">
        Wish<span className="text-coral-500">Bridge</span>
      </span>
    </Link>
  );
}
