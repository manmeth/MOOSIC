import { Check, Lock } from 'lucide-react';
import { Checkout, CheckoutResult } from './Checkout';
import { useState } from 'react';

type PremiumPageProps = {
  isPremium: boolean;
  onUpgrade: () => void;
};

type CheckoutState = 'closed' | 'open' | 'success' | 'failure';

const perks = [
  'Unlimited custom themes',
  'Offline downloadable tracks',
  'Premium-only room styling',
  'Priority playlist curation',
];

export function PremiumPage({ isPremium, onUpgrade }: PremiumPageProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('closed');
  const startCheckout = () => setCheckoutState('open');
  const completeCheckout = () => {
    setCheckoutState('success');
    onUpgrade();
  };

  return (
    <section className="page premium-page">
      <div className="eyebrow animate-rise">MOOSIC premium / 007</div>
      <div className="premium-header animate-rise-2">
        <div>
          <h1 className="section-title">Own the <em>room.</em></h1>
          <p>Unlock the premium layer of Moosic with better themes, download access, and a cleaner listening experience.</p>
        </div>
        <div className={`premium-status-pill ${isPremium ? 'is-active' : 'is-free'}`} aria-live="polite">
          {isPremium ? 'Premium active' : 'Free plan'}
        </div>
      </div>
      <div className="premium-grid animate-rise-3">
        <article className={`premium-plan-card premium-plan-card--featured ${isPremium ? 'is-current' : ''}`} aria-labelledby="premium-plan-title">
          <div className="plan-card-heading">
            <div>
              <div className="plan-topline">MOOSIC Premium</div>
              <h2 id="premium-plan-title">The complete room</h2>
            </div>
            {isPremium && <span className="plan-current-label">Current plan</span>}
          </div>
          <div className="plan-price">Rs 299<span>/month</span></div>
          <p className="plan-description">For listeners who want every part of Moosic to feel like theirs.</p>
          <ul>{perks.map((perk) => <li key={perk}><Check size={15} /> {perk}</li>)}</ul>
          <button className="solid-button premium-upgrade-button" type="button" onClick={startCheckout} disabled={isPremium} aria-label={isPremium ? 'Premium is already active' : 'Upgrade to Moosic Premium'} data-testid="button-upgrade-premium">
            {isPremium ? 'Premium unlocked' : 'Upgrade to premium'}
          </button>
        </article>
        <article className={`premium-plan-card premium-plan-card--info ${!isPremium ? 'is-current' : ''}`} aria-labelledby="free-plan-title">
          <div className="plan-card-heading">
            <div>
              <div className="plan-topline">Free plan</div>
              <h2 id="free-plan-title">The essentials</h2>
            </div>
            {!isPremium && <span className="plan-current-label">Current plan</span>}
          </div>
          <div className="plan-price">Rs 0<span>/month</span></div>
          <p className="plan-description">A simple starting point for finding the right mood and record.</p>
          <ul>
            <li><Check size={15} /> Basic moods and playlists</li>
            <li><Lock size={15} /> Downloaded songs unavailable</li>
            <li><Lock size={15} /> Premium themes unavailable</li>
          </ul>
          <button className="outline-button premium-upgrade-button" type="button" onClick={startCheckout} disabled={isPremium} aria-label={isPremium ? 'Free plan is not currently selected' : 'Compare Premium features'} data-testid="button-view-premium-plans">
            {isPremium ? 'Free plan' : 'Compare plans'}
          </button>
        </article>
      </div>
      {checkoutState === 'open' && <Checkout onSuccess={completeCheckout} onFailure={() => setCheckoutState('failure')} onCancel={() => setCheckoutState('closed')} />}
      {checkoutState === 'success' && <CheckoutResult success onContinue={() => setCheckoutState('closed')} onRetry={() => setCheckoutState('open')} />}
      {checkoutState === 'failure' && <CheckoutResult success={false} onContinue={() => setCheckoutState('closed')} onRetry={() => setCheckoutState('open')} />}
    </section>
  );
}
