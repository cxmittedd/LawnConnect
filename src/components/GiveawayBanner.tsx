import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, X, ArrowRight } from 'lucide-react';
import { GIVEAWAY, isGiveawayVisible } from '@/lib/giveaway';

const DISMISS_KEY = 'lawnconnect_giveaway_banner_dismissed_sep2026';

export function GiveawayBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isGiveawayVisible()) return;
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="relative z-[60] bg-primary text-primary-foreground animate-fade-in">
      <div className="container mx-auto flex items-center gap-3 px-4 py-2.5 pr-10 text-sm">
        <Gift className="h-4 w-4 shrink-0" />
        <p className="flex-1 leading-snug">
          <span className="font-semibold">{GIVEAWAY.prize} Giveaway</span>
          <span className="hidden sm:inline">
            {' '}— book any lawn care job in {GIVEAWAY.community} during September 2026 for a chance to win.
          </span>
          <span className="sm:hidden"> — book in September 2026 to enter.</span>
        </p>
        <Link
          to="/giveaway"
          className="hidden shrink-0 items-center gap-1 font-semibold underline underline-offset-4 sm:inline-flex"
        >
          See details
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss giveaway announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors hover:bg-primary-foreground/15"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
