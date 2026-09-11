import { Check, Lock } from 'lucide-react';
import type { CSSProperties } from 'react';

type ThemeOption = { name: string; color: string };

type ThemesProps = {
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  setNotice: (notice: string) => void;
  isPremium: boolean;
  themePalette: ThemeOption[];
};

export function Themes({ selectedColor, setSelectedColor, setNotice, isPremium, themePalette }: ThemesProps) {
  const premiumThemes = themePalette.slice(4);
  const availableThemes = isPremium ? themePalette : themePalette.filter((theme) => !premiumThemes.some((premiumTheme) => premiumTheme.color === theme.color));
  const applyTheme = (color: string) => {
    setSelectedColor(color);
    window.localStorage.setItem('moodsic-custom-theme', color);
    const theme = themePalette.find((option) => option.color === color);
    setNotice(`Custom theme changed to ${theme?.name ?? color}.`);
  };
  const clearTheme = () => {
    setSelectedColor(null);
    window.localStorage.removeItem('moodsic-custom-theme');
    setNotice('Back to the mood room background.');
  };

  return (
    <section className="page custom-theme-page">
      <div className="eyebrow animate-rise">Make the room yours / 005</div>
      <div className="theme-heading animate-rise">
        <div>
          <h1 className="section-title">Custom <em>Theme</em></h1>
          <p>Choose the background that matches how you feel right now. Your choice stays with you when you come back.</p>
        </div>
        <div className="theme-preview" style={{ background: selectedColor ?? '#090a12' }} aria-label={selectedColor ? `Current custom theme ${selectedColor}` : 'Using the current mood background'}>
          <span>{themePalette.find((option) => option.color === selectedColor)?.name ?? 'Mood room'}</span>
        </div>
      </div>
      {!isPremium && <div className="premium-lock-banner animate-rise-2"><Lock size={15} /><span>Upgrade to Premium to unlock the extra custom theme collection.</span></div>}
      <div className="theme-palette animate-rise-2" aria-label="Custom background colors">
        {availableThemes.map(({ name, color }) => <button key={color} className={`theme-swatch ${selectedColor === color ? 'selected' : ''}`} style={{ '--swatch': color } as CSSProperties} onClick={() => applyTheme(color)} aria-label={`Use ${name} as the background`} aria-pressed={selectedColor === color} data-testid={`button-theme-${color.slice(1)}`}><span className="theme-swatch-dot" /><span className="theme-swatch-copy"><strong>{name}</strong><small>{color}</small></span>{selectedColor === color && <Check size={16} />}</button>)}
        {!isPremium && premiumThemes.map(({ name, color }) => <button key={`${color}-locked`} className="theme-swatch premium-locked" style={{ '--swatch': color } as CSSProperties} type="button" onClick={() => setNotice(`${name} is a Premium theme. Upgrade to unlock it.`)} aria-disabled="true" aria-label={`${name} is a locked Premium theme`} data-testid={`button-theme-${color.slice(1)}-locked`}><span className="theme-swatch-dot" /><span className="theme-swatch-copy"><strong>{name}</strong><small>Premium only</small></span><Lock size={16} aria-hidden="true" /></button>)}
      </div>
      <div className="theme-actions animate-rise-3"><button className="outline-button small-button" onClick={clearTheme} disabled={!selectedColor} data-testid="button-reset-theme">Use mood background</button><span className="muted">{selectedColor ? 'Custom background active across your listening room.' : 'Pick a color to replace the default dark background.'}</span></div>
    </section>
  );
}
