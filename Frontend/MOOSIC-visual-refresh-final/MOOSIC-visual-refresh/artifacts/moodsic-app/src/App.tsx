import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Home as HomeIcon, ListMusic, Music2, Pause, Play, RotateCcw, Search, SkipBack, SkipForward, UserRound, X, Disc3, Pencil, Trash2, ArrowLeft, Shuffle, Volume2, Plus, Sparkles, Check, WandSparkles, Palette, LogOut, ArrowRight } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import logoAsset from '@assets/moodsic-references/moosic-logo.png';
import loginBackdropAsset from '@assets/moodsic-references/login-backdrop.png';
import loadingFieldAsset from '@assets/moodsic-references/loading-field.png';
import cowRunnerAsset from '@assets/moodsic-references/cow-runner.png';
import sadMoodArt from '@assets/moodsic-references/mood-art-sad.png';
import happyMoodArt from '@assets/moodsic-references/mood-art-happy.png';
import neutralMoodArt from '@assets/moodsic-references/mood-art-neutral.png';
import exhaustedMoodArt from '@assets/moodsic-references/mood-art-exhausted.png';
import angryMoodArt from '@assets/moodsic-references/mood-art-angry.png';
import { ErrorBoundary } from '@/components/error-boundary';

type MoodName = 'Sad' | 'Happy' | 'Neutral' | 'Exhausted' | 'Angry';
type Mood = { name: MoodName; color: string; background: string; text: string; line: string; description: string; art: string };
type Track = { title: string; artist: string; duration: string; mood: MoodName; audioUrl?: string };
type Playlist = { id: string; name: string; mood: MoodName; count: number; description: string; trackTitles: string[]; isCustom?: boolean };
type AuthUser = { id: string; email: string; name: string; username: string; role: string };
type AuthMode = 'login' | 'signup';

const moods: Mood[] = [
  { name: 'Sad', color: '#0c0d88', background: '#313ca8', text: '#f7efcd', line: 'Let the blue stay awhile.', description: 'A soft landing for the feelings that have nowhere else to go.', art: sadMoodArt },
  { name: 'Happy', color: '#f1bc46', background: '#f7d579', text: '#3d0000', line: 'Put some light back in the room.', description: 'Bright edges, open windows, and a little more movement.', art: happyMoodArt },
  { name: 'Neutral', color: '#5e08aa', background: '#9b55cb', text: '#f7efcd', line: 'A blank page with a pulse.', description: 'A considered middle ground for thinking, making, and drifting.', art: neutralMoodArt },
  { name: 'Exhausted', color: '#86a896', background: '#b6d3be', text: '#3d0000', line: 'Nothing to prove tonight.', description: 'Low lamps and slow songs for coming back to yourself.', art: exhaustedMoodArt },
  { name: 'Angry', color: '#da553b', background: '#ef8a76', text: '#f7efcd', line: 'Turn it up. Let it out.', description: 'A loud, honest room for the heat under your skin.', art: angryMoodArt },
];

const tracks: Track[] = [
  { title: 'Cake By The Ocean', artist: 'DNCE', duration: '3:39', mood: 'Happy' },
  { title: 'Electric Love', artist: 'BORNS', duration: '3:38', mood: 'Happy' },
  { title: 'Someone To You', artist: 'Banners', duration: '3:39', mood: 'Happy' },
  { title: 'Wake Me Up', artist: 'Avicii', duration: '4:07', mood: 'Happy' },
  { title: 'Circles', artist: 'Post Malone', duration: '3:35', mood: 'Happy' },
  { title: 'SuperMarket Flowers', artist: 'Ed Sheeran', duration: '3:41', mood: 'Sad' },
  { title: 'Funeral', artist: 'Band of Horses', duration: '3:55', mood: 'Sad' },
  { title: 'The Scientist', artist: 'Coldplay', duration: '5:09', mood: 'Sad' },
  { title: 'Six Feet Under', artist: 'Billie Eillish', duration: '3:09', mood: 'Sad' },
  { title: 'Cherry Wine', artist: 'Hozier', duration: '4:00', mood: 'Sad' },
  { title: 'Fake Plastic Trees', artist: 'Radiohead', duration: '4:50', mood: 'Neutral' },
  { title: 'Shallow', artist: 'Lady Gaga, Bradley Cooper', duration: '3:36', mood: 'Neutral' },
  { title: 'Holocene', artist: 'Bon Iver', duration: '5:36', mood: 'Neutral' },
  { title: 'Another Love', artist: 'Tom Odell', duration: '4:04', mood: 'Neutral' },
  { title: 'Orbiter', artist: 'Noah Kahan', duration: '3:41', mood: 'Neutral' },
  { title: 'Dancing With Your Ghost', artist: 'Sasha Alex Sloan', duration: '3:18', mood: 'Exhausted' },
  { title: 'You And Me', artist: 'Lifehouse', duration: '3:15', mood: 'Exhausted' },
  { title: 'Falling Like The Stars', artist: 'James Arthur', duration: '3:32', mood: 'Exhausted' },
  { title: 'Scarecrow', artist: 'Alex and Sierra', duration: '3:13', mood: 'Exhausted' },
  { title: 'Visions of Gideon', artist: 'Sufjan Stevens', duration: '3:34', mood: 'Exhausted' },
  { title: '21 Guns', artist: 'Green Day', duration: '5:21', mood: 'Angry' },
  { title: '9 to 5', artist: 'Dolly Parton', duration: '2:43', mood: 'Angry' },
  { title: 'Take Me Home, Country Roads', artist: 'John Denver', duration: '3:10', mood: 'Angry' },
  { title: 'The Zephyr Song', artist: 'Red Hot Chili Peppers', duration: '3:52', mood: 'Angry' },
  { title: 'Wonderwall', artist: 'Oasis', duration: '4:18', mood: 'Angry' },
  { title: 'Subhanallah', artist: 'Vishal Dadlani, Shekhar Ravjiani', duration: '4:09', mood: 'Happy' },
  { title: 'Tum Hi Ho', artist: 'Arijit Singh', duration: '4:22', mood: 'Happy' },
  { title: 'Bandhu', artist: 'Kailash Kher', duration: '4:36', mood: 'Happy' },
  { title: 'Uff Teri Adaa', artist: 'Shankar Mahadevan, Alyssa Mendonsa', duration: '5:04', mood: 'Happy' },
  { title: 'Dil Dhadakne Do', artist: 'Priyanka Chopra, Farhan Akhtar', duration: '3:50', mood: 'Happy' },
  { title: 'Phir Kabhi', artist: 'Arijit Singh', duration: '4:48', mood: 'Sad' },
  { title: 'Choo Lo', artist: 'The Local Train', duration: '3:53', mood: 'Sad' },
  { title: 'Jeena Jeena', artist: 'Atif Aslam', duration: '3:48', mood: 'Sad' },
  { title: 'Aaoge Jab Tum', artist: 'Rashid Khan', duration: '5:55', mood: 'Sad' },
  { title: 'Barsaat', artist: 'Rochak Kohli, Sonu Nigam', duration: '4:12', mood: 'Sad' },
  { title: 'Mere Bina', artist: 'Nikhil D’Souza', duration: '4:49', mood: 'Neutral' },
  { title: 'Soch Na Sake', artist: 'Arijit Singh, Tulsi Kumar', duration: '4:41', mood: 'Neutral' },
  { title: 'Tum Ho Toh', artist: 'Farhan Akhtar', duration: '3:58', mood: 'Neutral' },
  { title: 'Kasoor', artist: 'Prateek Kuhad', duration: '3:17', mood: 'Neutral' },
  { title: 'Kaisi Hai Ye Rut', artist: 'Srinivas', duration: '5:27', mood: 'Neutral' },
  { title: 'Tum Se Hi', artist: 'Mohit Chauhan', duration: '5:21', mood: 'Exhausted' },
  { title: 'Safarnama', artist: 'Lucky Ali', duration: '4:11', mood: 'Exhausted' },
  { title: 'Jaane Woh Kaise Log The', artist: 'Hemant Kumar', duration: '4:05', mood: 'Exhausted' },
  { title: 'Kun Faya Kun', artist: 'A.R. Rahman, Javed Ali, Mohit Chauhan', duration: '7:53', mood: 'Exhausted' },
  { title: 'Bekhayali', artist: 'Sachet Tandon', duration: '6:11', mood: 'Exhausted' },
  { title: 'Sadda Haq', artist: 'Mohit Chauhan', duration: '6:05', mood: 'Angry' },
  { title: 'Udta Punjab', artist: 'Amit Trivedi', duration: '4:17', mood: 'Angry' },
  { title: 'Rock On!!', artist: 'Farhan Akhtar', duration: '3:54', mood: 'Angry' },
  { title: 'Zinda', artist: 'Siddharth Mahadevan', duration: '3:31', mood: 'Angry' },
  { title: 'Khoon Mein Teri Mitti', artist: 'B Praak', duration: '5:10', mood: 'Angry' },
];

const playlists: Playlist[] = [
  { id: 'p1', name: 'Blue Hour', mood: 'Sad', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Sad').slice(0, 5).map((track) => track.title), description: 'For the quiet parts of the evening.' },
  { id: 'p1-hindi', name: 'Monsoon Letters', mood: 'Sad', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Sad').slice(5).map((track) => track.title), description: 'Hindi songs for the softer ache.' },
  { id: 'p2', name: 'Windows Down', mood: 'Happy', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Happy').slice(0, 5).map((track) => track.title), description: 'A little sunlight, pressed to vinyl.' },
  { id: 'p2-hindi', name: 'Desi Daydream', mood: 'Happy', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Happy').slice(5).map((track) => track.title), description: 'Hindi songs for the bright side.' },
  { id: 'p3', name: 'The Middle Distance', mood: 'Neutral', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Neutral').slice(0, 5).map((track) => track.title), description: 'Focus without the fuss.' },
  { id: 'p3-hindi', name: 'Soft Focus', mood: 'Neutral', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Neutral').slice(5).map((track) => track.title), description: 'Hindi songs for an easy middle ground.' },
  { id: 'p4', name: 'Low Battery', mood: 'Exhausted', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Exhausted').slice(0, 5).map((track) => track.title), description: 'Soft sounds for a soft landing.' },
  { id: 'p4-hindi', name: 'Sukoon Station', mood: 'Exhausted', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Exhausted').slice(5).map((track) => track.title), description: 'Hindi songs for the slow comedown.' },
  { id: 'p5', name: 'Loudly, Please', mood: 'Angry', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Angry').slice(0, 5).map((track) => track.title), description: 'Pressure, released.' },
  { id: 'p5-hindi', name: 'Gussa FM', mood: 'Angry', count: 5, trackTitles: tracks.filter((track) => track.mood === 'Angry').slice(5).map((track) => track.title), description: 'Hindi songs for the fire in your chest.' },
];

function moodFor(name: MoodName) {
  return moods.find((mood) => mood.name === name) ?? moods[2];
}

function moodStyle(mood: Mood): CSSProperties {
  return { '--mood': mood.color, '--mood-bg': mood.background, '--mood-text': mood.text } as CSSProperties;
}

function readableTextColor(color: string) {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return '#f7efcd';
  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.47 ? '#3d0000' : '#f7efcd';
}

function mutedTextColor(background?: string) {
  if (!background) return '#9d99a3';
  const hex = background.replace('#', '');
  if (hex.length !== 6) return '#9d99a3';
  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.13 ? '#4f4b57' : '#aaa6b2';
}

const themePalette = [
  { name: 'Blush With Benefits', color: '#b34b4b' },
  { name: 'Moss Boss', color: '#78ba61' },
  { name: 'Beetlejuice Berry', color: '#7f0202' },
  { name: 'Blue Me Away', color: '#4d7fde' },
  { name: 'Grape Expectations', color: '#c860ca' },
  { name: 'Sea-riously Chill', color: '#3aaaa1' },
  { name: 'Orange You Listening', color: '#ee933f' },
  { name: 'Drama Llama Pink', color: '#ea3b94' },
];

function avatarInitial(user: AuthUser | null) {
  return user?.username?.trim().charAt(0).toUpperCase() || user?.name?.trim().charAt(0).toUpperCase() || '?';
}

import api from './lib/api';

function LoadingScreen() {
  return (
    <main className="loading-screen" style={{ '--loading-field': `url(${loadingFieldAsset})` } as CSSProperties}>
      <div className="loading-haze" />
      <div className="loading-center" role="status" aria-live="polite">
        <div className="cow-spinner" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <img
              key={index}
              className="cow-runner"
              src={cowRunnerAsset}
              alt=""
              style={{ '--orbit-index': index } as CSSProperties}
            />
          ))}
        </div>
        <span>finding your room</span>
      </div>
    </main>
  );
}

function AuthPage({ mode, setMode, onAuthenticated, connectionError }: { mode: AuthMode; setMode: (mode: AuthMode) => void; onAuthenticated: (user: AuthUser) => void; connectionError?: string }) {
  const isSignup = mode === 'signup';
  const [form, setForm] = useState({ email: '', name: '', username: '', password: '' });
  const [message, setMessage] = useState(connectionError || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    try {
      if (isSignup) {
        if (form.password.length < 8) throw new Error('Password must be at least 8 characters.');
        const payload = await api.apiFetch('/users', { method: 'POST', body: { name: form.name.trim(), username: form.username.trim().toLowerCase(), email: form.email.trim().toLowerCase(), password: form.password } });
        const rawUser = payload?.user;
        const token = payload?.token;
        if (!rawUser || !token) throw new Error('Invalid response from server.');
        const mapped: AuthUser = {
          id: String(rawUser.user_id ?? rawUser.id ?? rawUser.userId ?? ''),
          email: rawUser.email ?? '',
          name: rawUser.name ?? '',
          username: rawUser.username ?? '',
          role: rawUser.role ?? '',
        };
        api.setToken(token);
        console.log('[auth] login success', mapped);
        onAuthenticated(mapped);
      } else {
        const payload = await api.apiFetch('/login', { method: 'POST', body: { email: form.email.trim().toLowerCase(), password: form.password } });
        const rawUser = payload?.user;
        const token = payload?.token;
        if (!rawUser || !token) throw new Error('Invalid response from server.');
        const mapped: AuthUser = {
          id: String(rawUser.user_id ?? rawUser.id ?? rawUser.userId ?? ''),
          email: rawUser.email ?? '',
          name: rawUser.name ?? '',
          username: rawUser.username ?? '',
          role: rawUser.role ?? '',
        };
        api.setToken(token);
        console.log('[auth] login success', mapped);
        onAuthenticated(mapped);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen" style={{ '--auth-backdrop': `url(${loginBackdropAsset})` } as CSSProperties}>
      <section className="auth-panel" aria-label={isSignup ? 'Create your MOOSIC account' : 'Log in to MOOSIC'}>
        <div className="auth-art" style={{ backgroundImage: `url(${loadingFieldAsset})` }} aria-hidden="true" />
        <div className="auth-form-side">
          <button className="auth-back" type="button" onClick={() => setMode('login')} disabled={!isSignup}>← Back</button>
          <div className="auth-heading">
            <span>{isSignup ? 'Sign up' : 'Login to'}</span>
            {!isSignup && <h1>MOOSIC</h1>}
          </div>
          <form onSubmit={submit} className="auth-form">
            {isSignup && <label>Name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} autoComplete="name" placeholder="Your name" required /></label>}
            {isSignup && <label>Username<input value={form.username} onChange={(event) => updateField('username', event.target.value)} autoComplete="username" placeholder="Choose a username" required /></label>}
            <label>Email<input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" placeholder="Enter email" required /></label>
            <label>Password<input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="Enter password" minLength={8} required /></label>
            {message && <p className="auth-message" role="alert">{message}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opening your room…' : isSignup ? 'Create account' : 'Enter MOOSIC'}</button>
          </form>
          <p className="auth-switch">{isSignup ? 'Already have an account?' : 'Don’t have an account?'} <button type="button" onClick={() => { setMode(isSignup ? 'login' : 'signup'); setMessage(''); }}>{isSignup ? 'Log in' : 'Sign up'}</button></p>
        </div>
      </section>
    </main>
  );
}

function AuthGate({
  authUser,
  setAuthUser,
  authMode,
  setAuthMode,
  children,
}: {
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  children: ReactNode;
}) {
  const [state, setState] = useState<'checking' | 'ready'>('checking');
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    if (authUser) {
      console.log('[auth] user already in state', authUser);
      setState('ready');
      return;
    }

    let active = true;
    const token = api.getToken();
    console.log('[auth] startup token found', Boolean(token));

    if (!token) {
      console.log('[auth] no token, showing login');
      setConnectionError('');
      setState('ready');
      return () => { active = false; };
    }

    (async () => {
      console.log('[auth] /me started');
      try {
        const payload = await api.apiFetch('/me');
        if (!active) return;
        const rawUser = payload?.user ?? payload;
        if (!rawUser) throw new Error('Failed to restore session.');
        const mapped: AuthUser = {
          id: String(rawUser.user_id ?? rawUser.id ?? rawUser.userId ?? ''),
          email: rawUser.email ?? '',
          name: rawUser.name ?? '',
          username: rawUser.username ?? '',
          role: rawUser.role ?? '',
        };
        console.log('[auth] /me succeeded, user restored', mapped);
        setAuthUser(mapped);
        setState('ready');
      } catch (err: any) {
        if (!active) return;
        console.log('[auth] /me failed', err?.status, err?.message);
        if (err?.status === 401) {
          api.clearToken();
          setConnectionError('Session expired. Please sign in again.');
        } else {
          setConnectionError(err instanceof Error ? err.message : 'Unable to reach authentication server.');
        }
        setAuthUser(null);
        setState('ready');
      }
    })();

    return () => { active = false; };
  }, [authUser, setAuthUser]);

  if (state === 'checking') return <LoadingScreen />;
  if (!authUser) return <AuthPage mode={authMode} setMode={setAuthMode} onAuthenticated={setAuthUser} connectionError={connectionError} />;
  return <>{children}</>;
}

function Brand() {
  return (
    <Link href="/" className="brand-lockup" data-testid="link-brand">
      <span className="brand-mark"><img src={logoAsset} alt="MOOSIC logo" data-testid="img-brand-logo" /></span>
      <span><span className="brand-name">MOOSIC</span></span>
    </Link>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const [location] = useLocation();
  const items = [
    { href: '/home', label: 'Now playing', icon: HomeIcon },
    { href: '/playlists', label: 'My playlists', icon: ListMusic },
    { href: '/restore', label: 'Restore', icon: RotateCcw },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/theme', label: 'Custom Theme', icon: Palette },
    { href: '/profile', label: 'Profile', icon: UserRound },
  ];
  return (
    <nav className={mobile ? 'mobile-nav' : 'nav-stack'} aria-label="Main navigation">
      {!mobile && <p className="nav-label">Browse</p>}
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`nav-link ${mobile ? '' : ''} ${location === href ? 'active' : ''}`} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}>
          <Icon />
          <span>{mobile ? label.split(' ')[0] : label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Shell({ children, authUser, appBackground }: { children: ReactNode; authUser: AuthUser; appBackground?: string }) {
  const [location] = useLocation();
  const isPicker = location === '/';
  const appForeground = readableTextColor(appBackground ?? '#090a12');
  return (
    <div className={`moodsic-app ${isPicker ? 'moodsic-app--picker' : ''}`} style={{ '--app-background': appBackground ?? '#090a12', '--app-foreground': appForeground, '--muted-ink': mutedTextColor(appBackground) } as CSSProperties}>
      <div className="shell-grid">
        <aside className={`side-rail ${isPicker ? 'picker-hidden-rail' : ''}`}>
          <Brand />
          <Navigation />
          <div className="rail-note"><strong>Tonight's note</strong>Music works better when you tell it the truth.</div>
        </aside>
        <main className="main-column">
          {isPicker ? (
            <header className="picker-topbar">
              <Link href="/" className="picker-brand" data-testid="link-picker-brand">
                <span className="brand-mark"><img src={logoAsset} alt="MOOSIC logo" /></span>
                <span>MOOSIC</span>
              </Link>
              <nav className="picker-nav" aria-label="MOOSIC navigation">
                <Link href="/" className="picker-nav-active">Home</Link>
                <Link href="/playlists">My playlists</Link>
                <Link href="/search">Search</Link>
              </nav>
              <Link href="/profile" className="picker-profile" title={`@${authUser.username}`} data-testid="link-picker-profile">{avatarInitial(authUser)}</Link>
            </header>
          ) : (
            <header className="topbar">
              <span className="topbar-title">Listening in <b>{location === '/home' ? 'the mood room' : location.slice(1)}</b></span>
              <div className="topbar-actions">
                <button className="icon-button" onClick={() => window.history.back()} aria-label="Go back" data-testid="button-go-back"><ArrowLeft size={16} /></button>
                <Link href="/profile" className="mini-avatar" title={`@${authUser.username}`} data-testid="link-avatar">{avatarInitial(authUser)}</Link>
              </div>
            </header>
          )}
          {children}
        </main>
      </div>
      {!isPicker && <Navigation mobile />}
    </div>
  );
}

function MoodPicker({ selectMood }: { selectMood: (name: MoodName) => void }) {
  return (
    <section className="page picker-page">
      <div className="picker-intro animate-rise">
        <h1 className="display-title">How are you<br /><em>feeling?</em></h1>
        <p>Pick a feeling and we’ll find the right record for the room you’re in.</p>
      </div>
      <div className="mood-carousel-wrap animate-rise-2">
        <div className="mood-list" role="list" aria-label="Choose your mood">
        {moods.map((mood, index) => (
          <button key={mood.name} className={`mood-choice mood-choice--${index + 1}`} style={moodStyle(mood)} onClick={() => selectMood(mood.name)} data-testid={`button-mood-${mood.name.toLowerCase()}`}>
            <span className="mood-color-surface" aria-hidden="true"><img src={mood.art} alt="" /></span>
            <span className="mood-card-footer">
              <span className="mood-card-name">{mood.name}</span>
            </span>
          </button>
        ))}
        </div>
      </div>
    </section>
  );
}

function PlaylistChoicePage({ moodName, library, deleted, choosePlaylist }: { moodName: MoodName; library: Playlist[]; deleted: string[]; choosePlaylist: (playlist: Playlist) => void }) {
  const mood = moodFor(moodName);
  const choices = library.filter((playlist) => playlist.mood === moodName && !deleted.includes(playlist.id));
  return (
    <section className="page playlist-choice-page" style={moodStyle(mood)}>
      <button className="back-link animate-rise" type="button" onClick={() => window.history.back()}><ArrowLeft size={15} /> Back to moods</button>
      <div className="playlist-choice-heading animate-rise-2">
        <div className="eyebrow">Two sides of the same feeling / {moodName}</div>
        <h1>Pick your<br /><em>playlist.</em></h1>
        <p>Same mood, different flavor. Choose the room you want to step into.</p>
      </div>
      <div className="playlist-choice-grid animate-rise-3">
        {choices.map((playlist, index) => (
          <button key={playlist.id} className="playlist-choice-card" onClick={() => choosePlaylist(playlist)} style={moodStyle(mood)} data-testid={`button-playlist-choice-${playlist.id}`}>
            <span className="choice-number">0{index + 1}</span>
            <span className="choice-disc" aria-hidden="true"><Disc3 size={46} strokeWidth={1} /></span>
            <span className="choice-copy">
              <strong>{playlist.name}</strong>
              <small>{playlist.description}</small>
              <span className="choice-meta">{playlist.trackTitles.length} tracks <ArrowRight size={14} /></span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecordCover({ mood, label = 'MOOSIC' }: { mood: Mood; label?: string }) {
  return (
    <div className="record-stage" style={moodStyle(mood)} aria-label={`${mood.name} vinyl record`}>
      <div className="record-shadow" />
      <div className="vinyl">
        <div className="label"><span className="label-text">{label}</span></div>
      </div>
      <div className="tone-arm"><span className="needle" /></div>
    </div>
  );
}

function HomePage({ selectedMood, selectedPlaylist, setNotice }: { selectedMood: MoodName; selectedPlaylist: Playlist | null; setNotice: (notice: string) => void }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [trackIndex, setTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, setLocation] = useLocation();
  const mood = moodFor(selectedMood);
  const moodTracks = selectedPlaylist
    ? tracks.filter((track) => selectedPlaylist.trackTitles.includes(track.title))
    : tracks.filter((track) => track.mood === selectedMood).slice(0, 5);
  const current = moodTracks[trackIndex % moodTracks.length] ?? tracks[0];
  useEffect(() => {
    audioRef.current?.pause();
    if (!current.audioUrl) {
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(current.audioUrl);
    audioRef.current = audio;
    audio.onended = () => setTrackIndex((index) => (index + 1) % moodTracks.length);
    audio.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false);
      setNotice('This track cannot autoplay. Press play to start it.');
    });
    return () => { audio.pause(); audio.onended = null; };
  }, [current.audioUrl, moodTracks.length, setNotice]);
  const togglePlayback = () => {
    if (!current.audioUrl) {
      setNotice('This track has no playable audio URL yet.');
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };
  const nextTrack = () => { setTrackIndex((index) => (index + 1) % moodTracks.length); };
  const previousTrack = () => { setTrackIndex((index) => (index - 1 + moodTracks.length) % moodTracks.length); };
  return (
    <section className="page" style={moodStyle(mood)}>
      <div className="mood-hero animate-rise">
        <div className="hero-copy">
          <div className="eyebrow">Your room tonight / {selectedMood} / {selectedPlaylist?.name ?? 'Mood mix'}</div>
          <h1>{mood.line}</h1>
          <p>{mood.description}</p>
          <div className="hero-links">
            <button className="solid-button" onClick={togglePlayback} data-testid="button-hero-play"><Play size={15} fill="currentColor" /> {isPlaying ? 'Playing now' : 'Play the room'}</button>
            <button className="outline-button" onClick={() => document.getElementById('mood-player')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-scroll-player"><Volume2 size={15} /> See the needle</button>
          </div>
        </div>
        <RecordCover mood={mood} label={selectedMood} />
      </div>
      <div className="player-grid animate-rise-2" id="mood-player">
        <div className="player-panel">
          <div className="now-playing">
            <div><div className="eyebrow" style={{ color: mood.color }}>Now on the turntable</div><div className="track-title" data-testid="text-current-track">{current.title}</div><div className="track-artist">{current.artist}</div></div>
          </div>
          <div className="progress-wrap">
            <div className="wave-row" aria-hidden="true">{Array.from({ length: 34 }).map((_, index) => <span key={index} style={{ '--bar': `${.25 + ((index * 17) % 70) / 100}` } as CSSProperties} />)}</div>
            <div className="progress-line"><span style={{ background: mood.color }} /></div>
            <div className="progress-times"><span>1:24</span><span>{current.duration}</span></div>
          </div>
          <div className="player-controls">
            <button className="player-control" onClick={() => setNotice('Shuffle is on for this room.')} aria-label="Shuffle" data-testid="button-shuffle"><Shuffle size={18} /></button>
            <button className="player-control" onClick={previousTrack} aria-label="Previous track" data-testid="button-previous"><SkipBack size={20} /></button>
            <button className="play-button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'} data-testid="button-play-pause">{isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
            <button className="player-control" onClick={nextTrack} aria-label="Next track" data-testid="button-next"><SkipForward size={20} /></button>
            <button className="player-control" onClick={() => setNotice('Volume is set for the room.')} aria-label="Volume" data-testid="button-volume"><Volume2 size={18} /></button>
          </div>
        </div>
        <div className="queue-panel">
          <div className="panel-heading"><h3>Coming up</h3><span>{moodTracks.length} sides</span></div>
          <div className="queue-list">{moodTracks.map((track, index) => (
              <button key={track.title} className={`queue-item ${track.title === current.title ? 'current' : ''}`} onClick={() => { setTrackIndex(index); }} data-testid={`button-queue-track-${index}`}>
              <span className="queue-number">0{index + 1}</span><span><strong>{track.title}</strong><small>{track.artist}</small></span><span className="queue-duration">{track.duration}</span>
            </button>
          ))}</div>
        </div>
      </div>
      <div className="hairline" style={{ margin: '45px 0 24px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span className="muted">Not quite the room you meant?</span>
        <button className="outline-button small-button" onClick={() => { setLocation('/'); setNotice('The room is ready for a new feeling.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} data-testid="button-choose-another"><RotateCcw size={14} /> Choose another mood</button>
      </div>
    </section>
  );
}

function PlaylistCover({ playlist }: { playlist: Playlist }) {
  const mood = moodFor(playlist.mood);
  return <div className="cover-art" style={moodStyle(mood)}><span className="cover-label">{playlist.mood}</span></div>;
}

function vibeNames(mood: MoodName, vibe: string, chosenTracks: Track[]) {
  const words = vibe.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
  const artist = chosenTracks[0]?.artist;
  const names: Record<MoodName, string[]> = {
    Happy: ['Sunlit Side A', 'Windows Down Forever', 'Good News in Stereo'],
    Sad: ['Blue Hour Letters', 'Softly, After All', 'Rain on Side B'],
    Neutral: ['The Middle Distance', 'Between the Lines', 'No Rush Radio'],
    Exhausted: ['Low Battery Lounge', 'A Quiet Kind of Gold', 'Rest Mode'],
    Angry: ['Turn It Up', 'Redline Records', 'Pressure Release'],
  };
  const base = words ? `${words.replace(/^\w/, (letter) => letter.toUpperCase())} / ${mood}` : names[mood][0];
  return [base, names[mood][1], artist ? `${artist} and the ${mood.toLowerCase()} hour` : names[mood][2]];
}

function PlaylistBuilder({ onCreate }: { onCreate: (playlist: Playlist) => void }) {
  const [name, setName] = useState('');
  const [mood, setMood] = useState<MoodName>('Neutral');
  const [vibe, setVibe] = useState('');
  const [songQuery, setSongQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const selected = tracks.filter((track) => selectedTracks.includes(track.title));
  const matches = tracks.filter((track) => {
    const value = `${track.title} ${track.artist}`.toLowerCase();
    return !songQuery.trim() || value.includes(songQuery.trim().toLowerCase());
  }).slice(0, 6);
  const toggleTrack = (title: string) => {
    setSelectedTracks((current) => current.includes(title) ? current.filter((track) => track !== title) : [...current, title]);
  };
  const suggest = () => {
    setIsThinking(true);
    window.setTimeout(() => {
      setSuggestions(vibeNames(mood, vibe, selected));
      setIsThinking(false);
    }, 350);
  };
  const create = () => {
    const finalName = name.trim() || suggestions[0];
    if (!finalName) return;
    onCreate({
      id: `custom-${Date.now()}`,
      name: finalName,
      mood,
      count: selectedTracks.length,
      trackTitles: selectedTracks,
      description: vibe.trim() || `A ${mood.toLowerCase()} room, made by you.`,
      isCustom: true,
    });
    setName('');
    setVibe('');
    setSelectedTracks([]);
    setSuggestions([]);
  };
  return (
    <section className="playlist-builder animate-rise-2">
      <div className="builder-copy">
        <div className="eyebrow">Make a new record / AI naming desk</div>
        <h2>Build a playlist<br /><em>from the feeling up.</em></h2>
        <p>Choose a mood, collect a few songs, and let moobot suggest a name that fits the room.</p>
        <label className="field-label" htmlFor="playlist-name">Playlist name <span>optional</span></label>
        <input id="playlist-name" className="builder-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Leave blank for an AI name" data-testid="input-new-playlist-name" />
        <label className="field-label" htmlFor="playlist-vibe">Describe the vibe</label>
        <textarea id="playlist-vibe" className="builder-input builder-textarea" value={vibe} onChange={(event) => setVibe(event.target.value)} placeholder="Late-night drive, messy dancing, quiet rain..." data-testid="input-playlist-vibe" />
        <div className="builder-fields">
          <label className="field-label" htmlFor="playlist-mood">Mood</label>
          <select id="playlist-mood" className="builder-input" value={mood} onChange={(event) => setMood(event.target.value as MoodName)} data-testid="select-playlist-mood">
            {moods.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}
          </select>
          <button className="outline-button builder-ai-button" onClick={suggest} disabled={isThinking} data-testid="button-suggest-playlist-name"><WandSparkles size={15} /> {isThinking ? 'moobot is thinking…' : 'Ask moobot for names'}</button>
        </div>
        {suggestions.length > 0 && <div className="ai-suggestions" aria-label="moobot playlist name suggestions"><span className="ai-label"><Sparkles size={13} /> moobot suggests</span>{suggestions.map((suggestion) => <button key={suggestion} className={`suggestion-chip ${name === suggestion ? 'selected' : ''}`} onClick={() => setName(suggestion)}>{suggestion}</button>)}</div>}
      </div>
      <div className="builder-tracks">
        <div className="panel-heading"><h3>Add songs</h3><span>{selectedTracks.length} selected</span></div>
        <input className="builder-input" value={songQuery} onChange={(event) => setSongQuery(event.target.value)} placeholder="Search songs or artists" aria-label="Search songs to add" data-testid="input-builder-song-search" />
        <div className="builder-track-list">{matches.map((track) => {
          const isSelected = selectedTracks.includes(track.title);
          return <button key={track.title} className={`builder-track ${isSelected ? 'selected' : ''}`} onClick={() => toggleTrack(track.title)} data-testid={`button-builder-track-${track.title.toLowerCase().replaceAll(' ', '-')}`}><span className="builder-track-check">{isSelected ? <Check size={13} /> : <Plus size={13} />}</span><span><strong>{track.title}</strong><small>{track.artist} / {track.mood}</small></span></button>;
        })}</div>
        <button className="solid-button builder-create-button" onClick={create} disabled={!name.trim() && suggestions.length === 0} data-testid="button-create-playlist"><Plus size={15} /> Create playlist</button>
      </div>
    </section>
  );
}

function PlaylistsPage({ library, selectMood, setNotice, deleted, setDeleted, onCreate }: { library: Playlist[]; selectMood: (mood: MoodName) => void; setNotice: (notice: string) => void; deleted: string[]; setDeleted: (ids: string[]) => void; onCreate: (playlist: Playlist) => void }) {
  const visible = library.filter((playlist) => !deleted.includes(playlist.id));
  const open = (playlist: Playlist) => { selectMood(playlist.mood); setNotice(`Opening ${playlist.name}.`); };
  return (
    <section className="page">
      <div className="page-heading animate-rise"><div><div className="eyebrow">The record shelf / 005</div><h1>My<br /><em>playlists</em></h1></div><Link href="/restore" className="outline-button" data-testid="link-restore-from-playlists"><RotateCcw size={15} /> Restore a playlist</Link></div>
      <PlaylistBuilder onCreate={(playlist) => { onCreate(playlist); setNotice(`${playlist.name} is now on your shelf.`); }} />
      <div className="library-grid animate-rise-2">
        {visible.map((playlist) => (
          <article className="library-card" key={playlist.id} data-testid={`card-playlist-${playlist.id}`}>
            <PlaylistCover playlist={playlist} />
            <div className="cover-meta"><div><h2>{playlist.name}</h2><p>{playlist.trackTitles.length} tracks / {playlist.description}</p></div><Disc3 size={17} color={moodFor(playlist.mood).color} /></div>
            <div className="card-actions">
              <button className="solid-button small-button" onClick={() => open(playlist)} data-testid={`button-open-playlist-${playlist.id}`}><Play size={13} fill="currentColor" /> Open</button>
              <button className="icon-button" onClick={() => { setDeleted([...deleted, playlist.id]); setNotice(`${playlist.name} moved to Restore.`); }} aria-label={`Delete ${playlist.name}`} data-testid={`button-delete-playlist-${playlist.id}`}><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && <div className="empty-state" style={{ marginTop: 15 }}><h2>The shelf is empty.</h2><p>Every record is waiting in Restore. Nothing is gone for good.</p><Link href="/restore" className="outline-button small-button" data-testid="link-empty-restore">Go to Restore</Link></div>}
    </section>
  );
}

function RestorePage({ library, deleted, setDeleted, setNotice }: { library: Playlist[]; deleted: string[]; setDeleted: (ids: string[]) => void; setNotice: (notice: string) => void }) {
  const deletedPlaylists = library.filter((playlist) => deleted.includes(playlist.id));
  const restore = (playlist: Playlist) => {
    setDeleted(deleted.filter((id) => id !== playlist.id));
    setNotice(`${playlist.name} is back on your shelf.`);
  };
  return (
    <section className="page">
      <div className="eyebrow animate-rise">The back room / 003</div>
      <div className="restore-panel animate-rise-2" style={{ marginTop: 26 }}>
        <div className="restore-disc" />
        <h1>Nothing is<br /><em>ever really gone.</em></h1>
        {deletedPlaylists.length > 0 ? <><p>{deletedPlaylists.length} deleted {deletedPlaylists.length === 1 ? 'record is' : 'records are'} waiting here. Choose what deserves another spin.</p><div className="restore-list">{deletedPlaylists.map((playlist) => <div className="restore-item" key={playlist.id}><PlaylistCover playlist={playlist} /><div className="restore-item-copy"><strong>{playlist.name}</strong><span>{playlist.trackTitles.length} tracks / {playlist.mood}</span></div><button className="solid-button small-button" onClick={() => restore(playlist)} data-testid={`button-restore-playlist-${playlist.id}`}><RotateCcw size={14} /> Restore</button></div>)}</div><button className="outline-button small-button" onClick={() => { setDeleted([]); setNotice('Every record is back on your shelf.'); }} data-testid="button-restore-all"><RotateCcw size={14} /> Restore all</button></> : <><p>Your deleted records will wait here for a little while. The back room is empty for now, but it knows how to hold a place.</p><Link href="/playlists" className="outline-button" data-testid="link-restore-back-library"><ListMusic size={15} /> Back to my playlists</Link></>}
      </div>
      <div style={{ marginTop: 32, color: '#777481', fontSize: 13 }} className="animate-rise-3"><span style={{ color: '#f1bc46' }}>A small promise:</span> accidental taps do not get the last word.</div>
    </section>
  );
}

function SearchPage({ library, selectMood, setNotice, addTrackToPlaylist }: { library: Playlist[]; selectMood: (mood: MoodName) => void; setNotice: (notice: string) => void; addTrackToPlaylist: (playlistId: string, trackTitle: string) => void }) {
  const [query, setQuery] = useState('');
  const [targetPlaylistId, setTargetPlaylistId] = useState(library[0]?.id ?? '');
  const normalized = query.trim().toLowerCase();
  const filteredTracks = useMemo(() => normalized ? tracks.filter((track) => `${track.title} ${track.artist} ${track.mood}`.toLowerCase().includes(normalized)) : tracks, [normalized]);
  const filteredPlaylists = useMemo(() => normalized ? library.filter((playlist) => `${playlist.name} ${playlist.description} ${playlist.mood}`.toLowerCase().includes(normalized)) : library, [normalized, library]);
  const hasResults = filteredTracks.length > 0 || filteredPlaylists.length > 0;
  return (
    <section className="page">
      <div className="eyebrow animate-rise">The listening desk / 004</div>
      <h1 className="section-title animate-rise" style={{ margin: '15px 0 0' }}>Find a feeling,<br /><em>not just a song.</em></h1>
      <label className="search-shell animate-rise-2"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="search-input" placeholder="Try “blue”, “Hozier”, or “Happy”" aria-label="Search MOOSIC" data-testid="input-search" /></label>
      <div className="search-save-bar animate-rise-2"><span>Save songs to</span><select value={targetPlaylistId} onChange={(event) => setTargetPlaylistId(event.target.value)} aria-label="Playlist to add songs to" data-testid="select-search-playlist">{library.map((playlist) => <option value={playlist.id} key={playlist.id}>{playlist.name}</option>)}</select><span className="muted">Add any result below to that playlist.</span></div>
      {hasResults ? <div className="result-columns animate-rise-3">
        <div className="result-section"><h2>Songs / {filteredTracks.length}</h2>{filteredTracks.map((track, index) => <div className="result-row" key={track.title}><div className="result-row-main"><strong>{track.title}</strong><small>{track.artist} / {track.mood}</small></div><div className="result-row-actions"><button className="icon-button" onClick={() => { selectMood(track.mood); setNotice(`Playing ${track.title}.`); }} aria-label={`Play ${track.title}`} data-testid={`button-search-track-${index}`}><Play size={14} fill="currentColor" /></button><button className="solid-button small-button" onClick={() => { addTrackToPlaylist(targetPlaylistId, track.title); setNotice(`${track.title} added to your playlist.`); }} data-testid={`button-add-search-track-${index}`}><Plus size={13} /> Add</button></div></div>)}</div>
        <div className="result-section"><h2>Playlists / {filteredPlaylists.length}</h2>{filteredPlaylists.map((playlist, index) => <div className="result-row" key={playlist.id}><div className="result-row-main"><strong>{playlist.name}</strong><small>{playlist.mood} / {playlist.trackTitles.length} tracks</small></div><button className="icon-button" onClick={() => { selectMood(playlist.mood); setNotice(`Opening ${playlist.name}.`); }} aria-label={`Open ${playlist.name}`} data-testid={`button-search-playlist-${index}`}><Disc3 size={14} /></button></div>)}</div>
      </div> : <div className="empty-state animate-rise-3"><h2>That record isn’t on the shelf.</h2><p>Try a song, artist, mood, or playlist title. The best finds are sometimes one letter away.</p><button className="outline-button small-button" onClick={() => setQuery('')} data-testid="button-clear-search"><X size={14} /> Clear search</button></div>}
    </section>
  );
}

function CustomThemePage({ selectedColor, setSelectedColor, setNotice }: { selectedColor: string | null; setSelectedColor: (color: string | null) => void; setNotice: (notice: string) => void }) {
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
        <div className="theme-preview" style={{ background: selectedColor ?? '#090a12', color: readableTextColor(selectedColor ?? '#090a12') }} aria-label={selectedColor ? `Current custom theme ${selectedColor}` : 'Using the current mood background'}>
          <span>{themePalette.find((option) => option.color === selectedColor)?.name ?? 'Mood room'}</span>
        </div>
      </div>
      <div className="theme-palette animate-rise-2" aria-label="Custom background colors">
        {themePalette.map(({ name, color }) => (
          <button
            key={color}
            className={`theme-swatch ${selectedColor === color ? 'selected' : ''}`}
            style={{ '--swatch': color } as CSSProperties}
            onClick={() => applyTheme(color)}
            aria-label={`Use ${name} as the background`}
            aria-pressed={selectedColor === color}
            data-testid={`button-theme-${color.slice(1)}`}
          >
            <span className="theme-swatch-dot" />
            <span className="theme-swatch-copy"><strong>{name}</strong><small>{color}</small></span>
            {selectedColor === color && <Check size={16} />}
          </button>
        ))}
      </div>
      <div className="theme-actions animate-rise-3">
        <button className="outline-button small-button" onClick={clearTheme} disabled={!selectedColor} data-testid="button-reset-theme">Use mood background</button>
        <span className="muted">{selectedColor ? 'Custom background active across your listening room.' : 'Pick a color to replace the default dark background.'}</span>
      </div>
    </section>
  );
}

function ProfilePage({ authUser, setNotice, onSignOut }: { authUser: AuthUser; setNotice: (notice: string) => void; onSignOut: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(authUser.name);
  const save = () => { setEditing(false); setNotice('Your profile note has been updated.'); };
  return (
    <section className="page">
      <div className="eyebrow animate-rise">Your listening log / 006</div>
      <div className="profile-layout" style={{ marginTop: 27 }}>
        <div className="profile-panel animate-rise-2">
          <div className="profile-avatar">{avatarInitial(authUser)}</div>
          {editing ? <div className="edit-form"><label htmlFor="profile-name">Name</label><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} data-testid="input-profile-name" /><label htmlFor="profile-note">Currently into</label><input id="profile-note" defaultValue="Slow records and late walks" data-testid="input-profile-note" /><div style={{ display: 'flex', gap: 8, marginTop: 7 }}><button className="solid-button small-button" onClick={save} data-testid="button-save-profile">Save changes</button><button className="outline-button small-button" onClick={() => setEditing(false)} data-testid="button-cancel-profile">Cancel</button></div></div> : <><h1>{authUser.username}</h1><p>{name} · Listening from a small room with the window open.</p><div className="profile-actions"><button className="outline-button small-button" onClick={() => setEditing(true)} data-testid="button-edit-profile"><Pencil size={14} /> Edit profile</button><button className="sign-out-button" onClick={onSignOut} data-testid="button-sign-out"><LogOut size={14} /> Sign out</button></div></>}
        </div>
        <div className="summary-panel animate-rise-3"><h2>February, in records</h2><div className="stat-grid"><div className="stat"><b>38</b><span>hours listened</span></div><div className="stat"><b>117</b><span>records visited</span></div><div className="stat"><b>24</b><span>favorite tracks</span></div></div><div className="taste-list"><div className="eyebrow">Your current rotation</div>{[['Happy', 76, '#f1bc46'], ['Neutral', 58, '#5e08aa'], ['Sad', 42, '#0c0d88']].map(([label, value, color]) => <div className="taste-line" key={label as string}><span>{label as string}</span><div className="taste-bar" style={{ '--taste': color as string } as CSSProperties}><span style={{ width: `${value}%` }} /></div><span>{value as number}%</span></div>)}</div></div>
      </div>
      <div className="hairline" style={{ marginTop: 28 }} />
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', color: '#8c8893', fontSize: 14 }}><span>Member since the first needle drop</span><Music2 size={17} color="#f1bc46" /></div>
    </section>
  );
}

function Router({
  authUser,
  setAuthUser,
  authMode,
  setAuthMode,
}: {
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const [location, setLocation] = useLocation();
  const [selectedMood, setSelectedMood] = useState<MoodName>('Neutral');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [library, setLibrary] = useState<Playlist[]>(() => {
    const stored = window.localStorage.getItem('moodsic-playlists');
    if (!stored) return playlists;
    try { return JSON.parse(stored) as Playlist[]; } catch { return playlists; }
  });
  const [deleted, setDeleted] = useState<string[]>(() => {
    const stored = window.localStorage.getItem('moodsic-deleted-playlists');
    if (!stored) return [];
    try { return JSON.parse(stored) as string[]; } catch { return []; }
  });
  const [notice, setNotice] = useState('');
  const [customTheme, setCustomTheme] = useState<string | null>(() => window.localStorage.getItem('moodsic-custom-theme'));
  const selectMood = (mood: MoodName) => { setSelectedMood(mood); setSelectedPlaylist(null); setLocation('/choose-playlist'); };
  const choosePlaylist = (playlist: Playlist) => { setSelectedPlaylist(playlist); setLocation('/home'); };
  const signOut = () => {
    console.log('[auth] logout triggered');
    api.clearToken();
    setAuthUser(null);
    setAuthMode('login');
    setLocation('/');
  };
  const addTrackToPlaylist = (playlistId: string, trackTitle: string) => {
    setLibrary((current) => current.map((playlist) => playlist.id === playlistId && !playlist.trackTitles.includes(trackTitle)
      ? { ...playlist, trackTitles: [...playlist.trackTitles, trackTitle], count: playlist.trackTitles.length + 1 }
      : playlist));
  };
  useEffect(() => { window.localStorage.setItem('moodsic-playlists', JSON.stringify(library)); }, [library]);
  useEffect(() => { window.localStorage.setItem('moodsic-deleted-playlists', JSON.stringify(deleted)); }, [deleted]);
  return (
    <AuthGate authUser={authUser} setAuthUser={setAuthUser} authMode={authMode} setAuthMode={setAuthMode}>
      <Shell
        authUser={authUser as AuthUser}
        appBackground={customTheme ?? (location === '/home' ? moodFor(selectedMood).background : undefined)}
      >
        {notice && <div className="notice notice-in" role="status" data-testid="status-notice"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss feedback" data-testid="button-dismiss-notice"><X size={16} /></button></div>}
        <ErrorBoundary resetKey={location}>
          <Switch>
            <Route path="/"><MoodPicker selectMood={selectMood} /></Route>
            <Route path="/choose-playlist"><PlaylistChoicePage moodName={selectedMood} library={library} deleted={deleted} choosePlaylist={choosePlaylist} /></Route>
            <Route path="/home"><HomePage selectedMood={selectedMood} selectedPlaylist={selectedPlaylist} setNotice={setNotice} /></Route>
            <Route path="/playlists"><PlaylistsPage library={library} selectMood={selectMood} setNotice={setNotice} deleted={deleted} setDeleted={setDeleted} onCreate={(playlist) => setLibrary((current) => [playlist, ...current])} /></Route>
            <Route path="/restore"><RestorePage library={library} deleted={deleted} setDeleted={setDeleted} setNotice={setNotice} /></Route>
            <Route path="/search"><SearchPage library={library} selectMood={selectMood} setNotice={setNotice} addTrackToPlaylist={addTrackToPlaylist} /></Route>
            <Route path="/theme"><CustomThemePage selectedColor={customTheme} setSelectedColor={setCustomTheme} setNotice={setNotice} /></Route>
            <Route path="/profile"><ProfilePage authUser={authUser as AuthUser} setNotice={setNotice} onSignOut={signOut} /></Route>
            <Route><NotFound /></Route>
          </Switch>
        </ErrorBoundary>
      </Shell>
    </AuthGate>
  );
}

function NotFound() {
  return <section className="page"><div className="eyebrow">404 / wrong side</div><h1 className="display-title">This record<br /><em>isn’t here.</em></h1><Link href="/" className="solid-button" data-testid="link-not-found-home">Back to the feeling picker</Link></section>;
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router
        authUser={authUser}
        setAuthUser={setAuthUser}
        authMode={authMode}
        setAuthMode={setAuthMode}
      />
    </WouterRouter>
  );
}

export default App;