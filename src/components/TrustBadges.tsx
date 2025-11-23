import { Shield, RefreshCw, Truck, BadgeCheck } from 'lucide-react';

interface TrustBadgesProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function TrustBadges({ variant = 'default', className = '' }: TrustBadgesProps) {
  const badges = [
    {
      icon: RefreshCw,
      title: '30-Day Returns',
      description: 'Easy returns & exchanges',
    },
    {
      icon: BadgeCheck,
      title: '100% Authentic',
      description: 'Guaranteed genuine products',
    },
    {
      icon: Truck,
      title: 'Free Shipping',
      description: 'On all orders above ₹999',
    },
    {
      icon: Shield,
      title: 'Secure Checkout',
      description: 'SSL encrypted payments',
    },
  ];

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap gap-3 sm:gap-4 ${className}`}>
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
              <Icon className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-muted-foreground">{badge.title}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {badges.map((badge, index) => {
        const Icon = badge.icon;
        return (
          <div
            key={index}
            className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/20 transition-colors"
          >
            <div className="p-2 rounded-full bg-success/10 flex-shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-xs sm:text-sm mb-0.5">{badge.title}</h4>
              <p className="text-xs text-muted-foreground leading-tight">{badge.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
