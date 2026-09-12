import { Check, CreditCard, Lock, X } from 'lucide-react';
import { useState } from 'react';

type CheckoutProps = {
  onSuccess: () => void;
  onFailure: () => void;
  onCancel: () => void;
};

export function Checkout({ onSuccess, onFailure, onCancel }: CheckoutProps) {
  const [form, setForm] = useState({ name: '', card: '', expiry: '', cvv: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const validate = () => {
    if (form.name.trim().length < 2) return 'Enter the cardholder name.';
    const cardDigits = form.card.replace(/[ -]/g, '');
    if (!/^\d{16}$/.test(cardDigits)) return 'Enter a valid 16-digit card number.';
    const expiryMatch = form.expiry.trim().match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/);
    if (!expiryMatch) return 'Use a valid expiry in MM / YY format.';
    const currentDate = new Date();
    const expiryYear = 2000 + Number(expiryMatch[2]);
    const expiryMonth = Number(expiryMatch[1]);
    if (expiryYear < currentDate.getFullYear() || (expiryYear === currentDate.getFullYear() && expiryMonth <= currentDate.getMonth())) return 'This card appears to be expired.';
    if (!/^\d{3,4}$/.test(form.cvv.trim())) return 'Enter a valid 3 or 4-digit CVV.';
    return '';
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      onSuccess();
    }, 650);
  };

  return (
    <div className="checkout-overlay" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <section className="checkout-panel">
        <div className="checkout-header">
          <div>
            <div className="eyebrow">Secure checkout / mock payment</div>
            <h2 id="checkout-title">Open the premium room.</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close checkout" data-testid="button-close-checkout"><X size={16} /></button>
        </div>
        <div className="checkout-summary">
          <span>MOOSIC Premium</span>
          <strong>Rs 299 / month</strong>
        </div>
        <form className="checkout-form" onSubmit={submit} noValidate>
          <label>Cardholder name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required placeholder="Your name" autoComplete="cc-name" aria-invalid={Boolean(error)} data-testid="input-checkout-name" /></label>
          <label>Card number<input value={form.card} onChange={(event) => updateField('card', event.target.value.replace(/[^\d -]/g, '').slice(0, 19))} required inputMode="numeric" placeholder="4242 4242 4242 4242" autoComplete="cc-number" aria-invalid={Boolean(error)} data-testid="input-checkout-card" /></label>
          <div className="checkout-fields">
            <label>Expiry<input value={form.expiry} onChange={(event) => updateField('expiry', event.target.value.slice(0, 7))} required placeholder="MM / YY" autoComplete="cc-exp" aria-invalid={Boolean(error)} data-testid="input-checkout-expiry" /></label>
            <label>CVV<input value={form.cvv} onChange={(event) => updateField('cvv', event.target.value.replace(/\D/g, '').slice(0, 4))} required inputMode="numeric" placeholder="123" autoComplete="cc-csc" aria-invalid={Boolean(error)} data-testid="input-checkout-cvv" /></label>
          </div>
          {error && <p className="checkout-error" role="alert" data-testid="text-checkout-error">{error}</p>}
          <button className="solid-button checkout-submit" type="submit" disabled={isSubmitting} data-testid="button-submit-checkout"><CreditCard size={15} /> {isSubmitting ? 'Processing payment...' : 'Complete mock payment'}</button>
          <button className="checkout-failure-button" type="button" onClick={onFailure} disabled={isSubmitting} data-testid="button-simulate-payment-failure">Simulate payment failure</button>
        </form>
        <p className="checkout-note"><Lock size={13} /> This is a frontend-only checkout preview. No payment is processed.</p>
      </section>
    </div>
  );
}

export function CheckoutResult({ success, onContinue, onRetry }: { success: boolean; onContinue: () => void; onRetry: () => void }) {
  return (
    <div className={`checkout-result ${success ? 'success' : 'failure'}`} role="status">
      <div className="checkout-result-icon">{success ? <Check size={22} /> : <X size={22} />}</div>
      <div>
        <div className="eyebrow">{success ? 'Payment complete' : 'Payment could not be completed'}</div>
        <h2>{success ? 'Welcome to Premium.' : 'The room is still waiting.'}</h2>
        <p>{success ? 'Your Premium features are unlocked for this session.' : 'This mock payment failed. You can try the checkout again.'}</p>
      </div>
      <div className="checkout-result-actions">
        {success ? <button className="solid-button" type="button" onClick={onContinue} data-testid="button-continue-after-checkout">Back to Premium</button> : <button className="solid-button" type="button" onClick={onRetry} data-testid="button-retry-checkout">Try again</button>}
        <button className="outline-button" type="button" onClick={onContinue} data-testid="button-close-checkout-result">Back to Premium</button>
      </div>
    </div>
  );
}
