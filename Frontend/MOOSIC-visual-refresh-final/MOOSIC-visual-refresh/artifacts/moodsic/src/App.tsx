import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Home as HomeIcon, ListMusic, Music2, Pause, Play, RotateCcw, Search, SkipBack, SkipForward, UserRound, X, Disc3, Pencil, Trash2, ArrowLeft, Shuffle, Volume2, VolumeX, Plus, Sparkles, Check, WandSparkles, Palette, LogOut, ArrowRight, Heart, Crown, LockKeyhole, Download, CreditCard } from 'lucide-react';
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
type Track = {
  id?: number;
  title: string;
  artist: string;
  duration: string;
  mood: MoodName;
  language?: string;
  genre?: string;
  audioUrl?: string;
  coverUrl?: string;
};

type BackendSong = {
  id: number;
  title: string;
  mood?: string | null;
  duration?: number | null;
  cover_url?: string | null;
  genre?: string | null;
  language?: string | null;
  audio_url?: string | null;
  is_playable?: boolean | null;
  artist_name?: string | null;
  artist?: { name?: string | null } | null;
};
type Playlist = {
  id: string;
  name: string;
  mood: MoodName;
  count: number;
  description: string;
  trackTitles: string[];
  isCustom?: boolean;
  backendId?: number;
};

type BackendPlaylist = {
  id?: number;
  playlist_id?: number;
  name?: string;
  title?: string;
  description?: string | null;
  cover_url?: string | null;
  songs?: unknown[];
};

type AuthUser = { id: string; email: string; name: string; username: string; role?: string; profileNote?: string };
type ListeningStats = {
  month_label: string;
  year: number;
  total_seconds: number;
  hours_listened: number;
  records_visited: number;
  favorite_tracks: number;
  rotation: Record<MoodName, number>;
  member_since?: string | null;
};
type AuthSession = { user: AuthUser; token: string };
type PremiumStatus = {
  is_premium: boolean;
  plan?: string | null;
  status?: string | null;
};

type ManagerDashboardData = {
  manager: { user_id: number; name: string; role: string };
  kpis: {
    total_users: number;
    premium_users: number;
    total_songs: number;
    total_artists: number;
    total_albums: number;
    successful_payments: number;
    total_revenue: number;
  };
};
type ManagerUser = { id: number; name: string; username: string; email: string; role: string; is_premium: boolean };
type ManagerPayment = { id: number; user_id: number; plan: string; amount: number; currency: string; status: string; payment_date: string };

type BackendDownload = {
  id: number;
  song_id: number;
  title: string;
  artist: string;
  downloaded_at: string;
  audio_url?: string | null;
};
type AuthMode = 'login' | 'signup';

const moods: Mood[] = [
  { name: 'Sad', color: '#0c0d88', background: '#313ca8', text: '#f7efcd', line: 'Let the blue stay awhile.', description: 'A soft landing for the feelings that have nowhere else to go.', art: sadMoodArt },
  { name: 'Happy', color: '#f1bc46', background: '#f7d579', text: '#3d0000', line: 'Put some light back in the room.', description: 'Bright edges, open windows, and a little more movement.', art: happyMoodArt },
  { name: 'Neutral', color: '#5e08aa', background: '#9b55cb', text: '#f7efcd', line: 'A blank page with a pulse.', description: 'A considered middle ground for thinking, making, and drifting.', art: neutralMoodArt },
  { name: 'Exhausted', color: '#86a896', background: '#b6d3be', text: '#3d0000', line: 'Nothing to prove tonight.', description: 'Low lamps and slow songs for coming back to yourself.', art: exhaustedMoodArt },
  { name: 'Angry', color: '#da553b', background: '#ef8a76', text: '#f7efcd', line: 'Turn it up. Let it out.', description: 'A loud, honest room for the heat under your skin.', art: angryMoodArt },
];

const fallbackTracks: Track[] = [
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

const playlistBlueprints = [
  { id: 'p1', name: 'Blue Hour', mood: 'Sad' as MoodName, language: 'non-hindi', description: 'For the quiet parts of the evening.' },
  { id: 'p1-hindi', name: 'Monsoon Letters', mood: 'Sad' as MoodName, language: 'Hindi', description: 'Hindi songs for the softer ache.' },
  { id: 'p2', name: 'Windows Down', mood: 'Happy' as MoodName, language: 'non-hindi', description: 'A little sunlight, pressed to vinyl.' },
  { id: 'p2-hindi', name: 'Desi Daydream', mood: 'Happy' as MoodName, language: 'Hindi', description: 'Hindi songs for the bright side.' },
  { id: 'p3', name: 'The Middle Distance', mood: 'Neutral' as MoodName, language: 'non-hindi', description: 'Focus without the fuss.' },
  { id: 'p3-hindi', name: 'Soft Focus', mood: 'Neutral' as MoodName, language: 'Hindi', description: 'Hindi songs for an easy middle ground.' },
  { id: 'p4', name: 'Low Battery', mood: 'Exhausted' as MoodName, language: 'non-hindi', description: 'Soft sounds for a soft landing.' },
  { id: 'p4-hindi', name: 'Sukoon Station', mood: 'Exhausted' as MoodName, language: 'Hindi', description: 'Hindi songs for the slow comedown.' },
  { id: 'p5', name: 'Loudly, Please', mood: 'Angry' as MoodName, language: 'non-hindi', description: 'Pressure, released.' },
  { id: 'p5-hindi', name: 'Gussa FM', mood: 'Angry' as MoodName, language: 'Hindi', description: 'Hindi songs for the fire in your chest.' },
];

const API_BASE = 'http://127.0.0.1:8000';

function isMoodName(value: string | null | undefined): value is MoodName {
  return value === 'Sad' || value === 'Happy' || value === 'Neutral' || value === 'Exhausted' || value === 'Angry';
}

function inferMood(song: BackendSong): MoodName {
  if (isMoodName(song.mood)) return song.mood;

  const genre = (song.genre ?? '').toLowerCase();

  if (/(ballad|romance|r&b|soul)/.test(genre)) return 'Sad';
  if (/(hip hop|dancehall|alternative rock)/.test(genre)) return 'Angry';
  if (/(classical|ambient|acoustic)/.test(genre)) return 'Exhausted';
  if (/(synthwave|indie pop|electropop|pop rock)/.test(genre)) return 'Neutral';
  if (/(dance pop|house|funk|latin pop|dance|pop)/.test(genre)) return 'Happy';

  return 'Neutral';
}

function formatDuration(totalSeconds?: number | null) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '--:--';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}


function parseDuration(value: string) {
  if (!value || value === '--:--') return 0;
  const parts = value.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function backendSongToTrack(song: BackendSong): Track {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist_name || song.artist?.name || 'Unknown artist',
    duration: formatDuration(song.duration),
    mood: inferMood(song),
    language: song.language ?? undefined,
    genre: song.genre ?? undefined,
    audioUrl: song.audio_url ?? undefined,
    coverUrl: song.cover_url ?? undefined,
  };
}

function buildDefaultPlaylists(catalog: Track[]): Playlist[] {
  return playlistBlueprints.map((blueprint) => {
    const moodTracks = catalog.filter((track) => track.mood === blueprint.mood);
    const sideTracks = moodTracks.filter((track) =>
      blueprint.language === 'Hindi'
        ? track.language?.toLowerCase() === 'hindi'
        : track.language?.toLowerCase() !== 'hindi'
    );

    // If a language side happens to be empty, use the mood catalogue rather than
    // rendering a playlist that cannot be opened.
    const selectedTracks = sideTracks.length > 0 ? sideTracks : moodTracks;

    return {
      id: blueprint.id,
      name: blueprint.name,
      mood: blueprint.mood,
      count: selectedTracks.length,
      trackTitles: selectedTracks.map((track) => track.title),
      description: blueprint.description,
    };
  });
}

const fallbackPlaylists = buildDefaultPlaylists(fallbackTracks);

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

const AUTH_STORAGE_KEY = 'moodsic-auth-session';
const LEGACY_DEMO_USER_KEY = 'moodsic-demo-user';

function normalizeBackendUser(raw: unknown): AuthUser {
  const user = (raw ?? {}) as {
    user_id?: number | string;
    id?: number | string;
    email?: string;
    name?: string;
    username?: string;
    role?: string;
    profile_note?: string | null;
  };

  const id = user.user_id ?? user.id;

  if (
    id == null ||
    !user.email ||
    !user.name ||
    !user.username
  ) {
    throw new Error('The backend returned an invalid user record.');
  }

  return {
    id: String(id),
    email: user.email,
    name: user.name,
    username: user.username,
    role: user.role,
    profileNote: user.profile_note ?? '',
  };
}

function tokenHasExpired(token: string) {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return true;

    const normalized = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded =
      normalized +
      '='.repeat((4 - (normalized.length % 4)) % 4);

    const payload = JSON.parse(window.atob(padded)) as {
      exp?: number;
    };

    return typeof payload.exp === 'number'
      ? payload.exp <= Date.now() / 1000
      : false;
  } catch {
    return true;
  }
}

function readAuthSession(): AuthSession | null {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const session = JSON.parse(stored) as AuthSession;

    if (
      !session?.token ||
      !session?.user ||
      !session.user.email ||
      tokenHasExpired(session.token)
    ) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function storeAuthSession(session: AuthSession) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(session)
  );

  // Remove the old fake-login state from earlier development versions.
  window.localStorage.removeItem(LEGACY_DEMO_USER_KEY);
}

function clearAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_DEMO_USER_KEY);
}

function apiErrorMessage(payload: unknown, fallback: string) {
  const data = (payload ?? {}) as {
    detail?: string | Array<{ msg?: string }>;
    message?: string;
  };

  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    const messages = data.detail
      .map((item) => item?.msg)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  return fallback;
}

async function postAuth(
  path: '/users' | '/login',
  body: Record<string, string>
) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      apiErrorMessage(
        payload,
        `Request failed with status ${response.status}.`
      )
    );
  }

  return payload as {
    message?: string;
    token?: string;
    user?: unknown;
  };
}

async function loginWithBackend(
  email: string,
  password: string
): Promise<AuthSession> {
  const payload = await postAuth('/login', {
    email: email.trim().toLowerCase(),
    password,
  });

  if (!payload.token || !payload.user) {
    throw new Error(
      'Login succeeded, but the backend did not return a valid session.'
    );
  }

  return {
    user: normalizeBackendUser(payload.user),
    token: payload.token,
  };
}

function getAuthenticatedSession() {
  const session = readAuthSession();

  if (!session) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return session;
}

async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const session = getAuthenticatedSession();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
    }

    throw new Error(
      apiErrorMessage(
        payload,
        `Request failed with status ${response.status}.`
      )
    );
  }

  return payload;
}

function unwrapArray(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function backendPlaylistId(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const nested =
    record.playlist && typeof record.playlist === 'object'
      ? record.playlist as Record<string, unknown>
      : null;

  const value =
    record.id ??
    record.playlist_id ??
    nested?.id ??
    nested?.playlist_id;

  const id = Number(value);

  return Number.isFinite(id) && id > 0
    ? id
    : null;
}

function encodePlaylistDescription(
  description: string,
  mood: MoodName
) {
  return `[[MOOSIC_MOOD:${mood}]] ${description}`.trim();
}

function decodePlaylistDescription(
  rawDescription: unknown,
  fallbackMood: MoodName
) {
  const description =
    typeof rawDescription === 'string'
      ? rawDescription
      : '';

  const match = description.match(
    /^\[\[MOOSIC_MOOD:(Sad|Happy|Neutral|Exhausted|Angry)\]\]\s*/
  );

  const mood =
    match && isMoodName(match[1])
      ? match[1]
      : fallbackMood;

  return {
    mood,
    description: description
      .replace(
        /^\[\[MOOSIC_MOOD:(Sad|Happy|Neutral|Exhausted|Angry)\]\]\s*/,
        ''
      )
      .trim(),
  };
}

function inferPlaylistMoodFromTracks(
  tracks: Track[]
): MoodName {
  if (tracks.length === 0) {
    return 'Neutral';
  }

  const counts = new Map<MoodName, number>();

  for (const track of tracks) {
    counts.set(
      track.mood,
      (counts.get(track.mood) ?? 0) + 1
    );
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Neutral';
}

function playlistTracksFromPayload(
  payload: unknown,
  catalog: Track[]
) {
  const items = unwrapArray(
    payload,
    ['songs', 'items', 'results', 'data']
  );

  const resolved: Track[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const wrapper = item as Record<string, unknown>;
    const nestedSong =
      wrapper.song && typeof wrapper.song === 'object'
        ? wrapper.song as Record<string, unknown>
        : wrapper;

    const rawId =
      nestedSong.id ??
      nestedSong.song_id ??
      wrapper.song_id;

    const songId = Number(rawId);

    let track =
      Number.isFinite(songId)
        ? catalog.find((candidate) => candidate.id === songId)
        : undefined;

    if (!track) {
      const title =
        typeof nestedSong.title === 'string'
          ? nestedSong.title
          : null;

      if (title) {
        track = catalog.find(
          (candidate) =>
            candidate.title.toLowerCase() ===
            title.toLowerCase()
        );
      }
    }

    if (track && !resolved.some((candidate) => candidate.id === track?.id && candidate.title === track?.title)) {
      resolved.push(track);
    }
  }

  return resolved;
}

async function backendPlaylistToPlaylist(
  raw: unknown,
  catalog: Track[]
): Promise<Playlist | null> {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const nested =
    record.playlist && typeof record.playlist === 'object'
      ? record.playlist as Record<string, unknown>
      : record;

  const id = backendPlaylistId(raw);

  if (!id) {
    return null;
  }

  const nameValue =
    nested.name ??
    nested.title ??
    record.name ??
    record.title;

  const name =
    typeof nameValue === 'string' && nameValue.trim()
      ? nameValue.trim()
      : `Playlist ${id}`;

  let playlistTracks: Track[] = [];

  try {
    const songsPayload = await apiRequest(
      `/playlists/${id}/songs`
    );

    playlistTracks = playlistTracksFromPayload(
      songsPayload,
      catalog
    );
  } catch (error) {
    console.error(
      `Failed to load songs for playlist ${id}:`,
      error
    );
  }

  const fallbackMood =
    inferPlaylistMoodFromTracks(playlistTracks);

  const decoded = decodePlaylistDescription(
    nested.description ?? record.description,
    fallbackMood
  );

  return {
    id: String(id),
    backendId: id,
    name,
    mood: decoded.mood,
    count: playlistTracks.length,
    description:
      decoded.description ||
      `A ${decoded.mood.toLowerCase()} room, made by you.`,
    trackTitles: playlistTracks.map(
      (track) => track.title
    ),
    isCustom: true,
  };
}

async function fetchUserPlaylists(
  userId: number,
  catalog: Track[],
  recycleBin = false
) {
  const suffix = recycleBin
    ? '/recycle-bin'
    : '';

  const payload = await apiRequest(
    `/users/${userId}/playlists${suffix}`
  );

  const rawPlaylists = unwrapArray(
    payload,
    ['playlists', 'items', 'results', 'data']
  );

  const playlists = await Promise.all(
    rawPlaylists.map((raw) =>
      backendPlaylistToPlaylist(raw, catalog)
    )
  );

  return playlists.filter(
    (playlist): playlist is Playlist =>
      playlist !== null
  );
}

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

    if (isSignup && form.password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const email = form.email.trim().toLowerCase();
      const password = form.password;

      if (isSignup) {
        await postAuth('/users', {
          name: form.name.trim(),
          username: form.username.trim(),
          email,
          password,
        });
      }

      // Always log in after registration. This gives us the backend's
      // canonical user object and JWT even if /users changes its response shape.
      const session = await loginWithBackend(email, password);

      storeAuthSession(session);
      onAuthenticated(session.user);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Try again.'
      );
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
            {isSignup && (
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  required
                />
              </label>
            )}
            {isSignup && (
              <label>
                Username
                <input
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  autoComplete="username"
                  placeholder="Choose a username"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                autoComplete="email"
                placeholder="Enter email"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'At least 8 characters' : 'Enter password'}
                minLength={isSignup ? 8 : 1}
                required
              />
            </label>
            {message && <p className="auth-message" role="alert">{message}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (isSignup ? 'Creating your account…' : 'Signing you in…')
                : isSignup
                  ? 'Create account'
                  : 'Enter MOOSIC'}
            </button>
          </form>
          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'Don’t have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? 'login' : 'signup');
                setMessage('');
              }}
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>
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
  const [state, setState] = useState<'checking' | 'ready'>(
    authUser ? 'ready' : 'checking'
  );
  const [connectionError] = useState('');

  useEffect(() => {
    if (authUser) {
      setState('ready');
      return;
    }

    const session = readAuthSession();

    if (session) {
      setAuthUser(session.user);
    }

    setState('ready');
  }, [authUser, setAuthUser]);

  if (state === 'checking') {
    return <LoadingScreen />;
  }

  if (!authUser) {
    return (
      <AuthPage
        mode={authMode}
        setMode={setAuthMode}
        onAuthenticated={setAuthUser}
        connectionError={connectionError}
      />
    );
  }

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

function Navigation({ mobile = false, authUser }: { mobile?: boolean; authUser?: AuthUser | null }) {
  const [location] = useLocation();
  const items = [
    { href: '/home', label: 'Now playing', icon: HomeIcon },
    { href: '/playlists', label: 'My playlists', icon: ListMusic },
    { href: '/restore', label: 'Restore', icon: RotateCcw },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/downloads', label: 'Downloads', icon: Download },
    { href: '/theme', label: 'Custom Theme', icon: Palette },
    { href: '/premium', label: 'Premium', icon: Crown },
    { href: '/profile', label: 'Profile', icon: UserRound },
    ...(authUser?.role === 'manager' ? [{ href: '/manager', label: 'Manager', icon: Crown }] : []),
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

function Shell({ children, authUser, appBackground, isPremium }: { children: ReactNode; authUser: AuthUser; appBackground?: string; isPremium: boolean }) {
  const [location] = useLocation();
  const isPicker = location === '/';
  const appForeground = readableTextColor(appBackground ?? '#090a12');
  return (
    <div className={`moodsic-app ${isPicker ? 'moodsic-app--picker' : ''}`} style={{ '--app-background': appBackground ?? '#090a12', '--app-foreground': appForeground, '--muted-ink': mutedTextColor(appBackground) } as CSSProperties}>
      <div className="shell-grid">
        <aside className={`side-rail ${isPicker ? 'picker-hidden-rail' : ''}`}>
          <Brand />
          <Navigation authUser={authUser} />
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
                <Link href="/premium">Premium</Link>
              </nav>
              <Link href="/profile" className="picker-profile" title={`@${authUser.username}`} data-testid="link-picker-profile">{avatarInitial(authUser)}</Link>
            </header>
          ) : (
            <header className="topbar">
              <span className="topbar-title">Listening in <b>{location === '/home' ? 'the mood room' : location.slice(1)}</b></span>
              <div className="topbar-actions">
                <Link
                  href="/premium"
                  data-testid="link-plan-status"
                  style={{
                    border: `1px solid ${isPremium ? '#f1bc46' : '#575866'}`,
                    color: isPremium ? '#f1bc46' : '#c7c1c9',
                    borderRadius: 999,
                    padding: '8px 14px',
                    fontSize: 10,
                    letterSpacing: '.13em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    background: isPremium ? 'rgba(241,188,70,.08)' : 'rgba(255,255,255,.025)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isPremium ? 'Premium' : 'Free Plan'}
                </Link>
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

function PlaylistChoicePage({ moodName, library, choosePlaylist }: { moodName: MoodName; library: Playlist[]; choosePlaylist: (playlist: Playlist) => void }) {
  const mood = moodFor(moodName);
  const choices = library.filter((playlist) => playlist.mood === moodName);
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


let youtubeIframeApiPromise: Promise<any> | null = null;

function extractYouTubeVideoId(url?: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url, window.location.origin);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    }

    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch?.[1]) return embedMatch[1];

    return parsed.searchParams.get('v');
  } catch {
    const match = url.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return match?.[1] ?? null;
  }
}

function loadYouTubeIframeApi() {
  const currentYT = (window as any).YT;
  if (currentYT?.Player) {
    return Promise.resolve(currentYT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = (window as any).onYouTubeIframeAPIReady;

    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') {
        previousReady();
      }
      resolve((window as any).YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube player API could not be loaded.'));
      document.head.appendChild(script);
    }
  });

  return youtubeIframeApiPromise;
}

function HomePage({
  selectedMood,
  selectedPlaylist,
  setNotice,
  tracks,
  userId,
  compact = false,
  isPremium,
  downloadedSongIds,
  onDownload,
}: {
  selectedMood: MoodName;
  selectedPlaylist: Playlist | null;
  setNotice: (notice: string) => void;
  tracks: Track[];
  userId: number;
  compact?: boolean;
  isPremium: boolean;
  downloadedSongIds: Set<number>;
  onDownload: (track: Track) => Promise<void> | void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playerStarted, setPlayerStarted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [seekPreviewSeconds, setSeekPreviewSeconds] = useState<number | null>(null);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState<Set<number>>(new Set());

  // Playback is independent from the room currently being browsed.
  const [activeQueue, setActiveQueue] = useState<Track[]>([]);
  const [activeMoodName, setActiveMoodName] = useState<MoodName>(selectedMood);
  const [activeRoomName, setActiveRoomName] = useState('Mood mix');

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const pendingVideoRef = useRef<{ videoId: string; autoplay: boolean } | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const playerTracksRef = useRef<Track[]>([]);
  const trackIndexRef = useRef(0);
  const shuffleEnabledRef = useRef(false);
  const isPlayingRef = useRef(false);
  const playerStateHandlerRef = useRef<(state: number) => void>(() => {});
  const advanceTrackRef = useRef<(direction: 1 | -1, automatic?: boolean) => void>(() => {});
  const playHistoryRef = useRef<number[]>([]);

  const historyIdRef = useRef<number | null>(null);
  const historySongIdRef = useRef<number | null>(null);
  const historyCreatePromiseRef = useRef<Promise<number | null> | null>(null);
  const lastPersistedSecondRef = useRef(0);

  const [, setLocation] = useLocation();

  const viewedMood = moodFor(selectedMood);

  const viewedTracksRaw = selectedPlaylist
    ? tracks.filter((track) =>
        selectedPlaylist.trackTitles.includes(track.title)
      )
    : tracks.filter((track) => track.mood === selectedMood);

  const viewedTracks =
    viewedTracksRaw.length > 0
      ? viewedTracksRaw
      : tracks.filter((track) => track.mood === selectedMood);

  // Before playback starts, the player previews the room being viewed.
  // Once playback has started, it stays on activeQueue until the user
  // explicitly presses Play on another room or selects another song.
  const playerTracks =
    activeQueue.length > 0
      ? activeQueue
      : viewedTracks;

  const safeTrackIndex =
    playerTracks.length > 0
      ? trackIndex % playerTracks.length
      : 0;

  const current =
    playerTracks.length > 0
      ? playerTracks[safeTrackIndex]
      : tracks[0] ?? fallbackTracks[0];

  const activeMood = moodFor(
    activeQueue.length > 0
      ? activeMoodName
      : selectedMood
  );

  const totalSeconds =
    durationSeconds > 0
      ? durationSeconds
      : parseDuration(current.duration);

  const displayedSeconds =
    seekPreviewSeconds ?? currentSeconds;

  const progressPercent =
    totalSeconds > 0
      ? Math.min(100, (displayedSeconds / totalSeconds) * 100)
      : 0;

  const currentAudioUrl = current?.audioUrl;
  const currentVideoId = extractYouTubeVideoId(currentAudioUrl);

  playerTracksRef.current = playerTracks;
  trackIndexRef.current = safeTrackIndex;
  shuffleEnabledRef.current = shuffleEnabled;
  isPlayingRef.current = isPlaying;

  if (!currentTrackRef.current && current) {
    currentTrackRef.current = current;
  }

  const readPlayerTime = () => {
    try {
      const value = Number(youtubePlayerRef.current?.getCurrentTime?.() ?? 0);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  };

  const readPlayerDuration = () => {
    try {
      const value = Number(youtubePlayerRef.current?.getDuration?.() ?? 0);
      return Number.isFinite(value) && value > 0
        ? value
        : parseDuration(currentTrackRef.current?.duration ?? current.duration);
    } catch {
      return parseDuration(currentTrackRef.current?.duration ?? current.duration);
    }
  };

  const beginListeningSession = (track: Track) => {
    if (!track.id || !Number.isFinite(userId)) return;

    if (historySongIdRef.current !== track.id) {
      historySongIdRef.current = track.id;
      historyIdRef.current = null;
      historyCreatePromiseRef.current = null;
      lastPersistedSecondRef.current = 0;
    }
  };

  const persistListeningProgress = async (
    completed = false,
    skipped = false
  ) => {
    const track = currentTrackRef.current;
    if (!track?.id || !Number.isFinite(userId)) return;

    const progressSeconds = Math.max(0, Math.floor(readPlayerTime()));

    if (progressSeconds <= 0 && !completed && !skipped) {
      return;
    }

    beginListeningSession(track);

    try {
      let historyId = historyIdRef.current;

      if (!historyId) {
        if (!historyCreatePromiseRef.current) {
          const songId = track.id;

          historyCreatePromiseRef.current = (async () => {
            const payload = await apiRequest(
              `/users/${userId}/listening-history`,
              {
                method: 'POST',
                body: JSON.stringify({
                  song_id: songId,
                  progress_seconds: progressSeconds,
                  completed,
                  skipped,
                }),
              }
            ) as { history_id?: number };

            const createdId = Number(payload.history_id);

            if (
              historySongIdRef.current === songId &&
              Number.isFinite(createdId) &&
              createdId > 0
            ) {
              historyIdRef.current = createdId;
            }

            return Number.isFinite(createdId) && createdId > 0
              ? createdId
              : null;
          })();
        }

        historyId = await historyCreatePromiseRef.current;
        historyCreatePromiseRef.current = null;

        // The POST already carried the latest progress/state.
        lastPersistedSecondRef.current = progressSeconds;
        return;
      }

      await apiRequest(
        `/users/${userId}/listening-history/${historyId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            progress_seconds: progressSeconds,
            completed,
            skipped,
          }),
        }
      );

      lastPersistedSecondRef.current = progressSeconds;
    } catch (error) {
      historyCreatePromiseRef.current = null;
      console.error('Failed to persist listening history:', error);
    }
  };

  const finishListeningSession = async (
    completed = false,
    skipped = false
  ) => {
    const songId = historySongIdRef.current;

    if (!songId) return;

    await persistListeningProgress(completed, skipped);

    if (historySongIdRef.current === songId) {
      historyIdRef.current = null;
      historySongIdRef.current = null;
      historyCreatePromiseRef.current = null;
      lastPersistedSecondRef.current = 0;
    }
  };

  const loadTrackIntoPlayer = (
    track: Track,
    autoplay = true
  ) => {
    const videoId = extractYouTubeVideoId(track.audioUrl);

    if (!videoId) {
      setNotice(`"${track.title}" does not have a valid YouTube playback URL.`);
      return false;
    }

    currentTrackRef.current = track;
    setPlayerStarted(true);
    setSeekPreviewSeconds(null);
    setCurrentSeconds(0);
    setDurationSeconds(parseDuration(track.duration));

    const player = youtubePlayerRef.current;

    if (playerReadyRef.current && player) {
      try {
        player.setVolume?.(volume);
        if (isMuted) player.mute?.();
        else player.unMute?.();

        if (autoplay) {
          player.loadVideoById?.(videoId);
        } else {
          player.cueVideoById?.(videoId);
        }
      } catch (error) {
        console.error('Failed to load YouTube track:', error);
      }
    } else {
      pendingVideoRef.current = { videoId, autoplay };
    }

    return true;
  };

  const loadFavorites = async () => {
    if (!Number.isFinite(userId)) {
      return;
    }

    try {
      const payload = await apiRequest(
        `/users/${userId}/liked-songs`
      );

      const rows =
        Array.isArray(payload)
          ? payload
          : [];

      const ids = new Set<number>();

      for (const row of rows) {
        if (
          !row ||
          typeof row !== 'object'
        ) {
          continue;
        }

        const song = (
          row as {
            song?: { id?: number };
          }
        ).song;

        if (
          Number.isFinite(
            Number(song?.id)
          )
        ) {
          ids.add(Number(song?.id));
        }
      }

      setLikedSongIds(ids);
    } catch (error) {
      console.error(
        'Failed to load favorites:',
        error
      );
    }
  };

  useEffect(() => {
    void loadFavorites();
  }, [userId]);

  const findPlayableTrack = (
    direction: 1 | -1,
    queue: Track[] = playerTracksRef.current,
    baseIndex: number = trackIndexRef.current
  ) => {
    if (queue.length === 0) return -1;

    const playableIndexes = queue
      .map((track, index) => ({ track, index }))
      .filter(({ track }) => Boolean(extractYouTubeVideoId(track.audioUrl)))
      .map(({ index }) => index);

    if (playableIndexes.length === 0) return -1;

    if (
      direction === 1 &&
      shuffleEnabledRef.current &&
      playableIndexes.length > 1
    ) {
      const alternatives = playableIndexes.filter(
        (index) => index !== baseIndex
      );

      return alternatives[
        Math.floor(Math.random() * alternatives.length)
      ];
    }

    for (let step = 1; step <= queue.length; step++) {
      const candidate =
        (baseIndex + direction * step + queue.length) % queue.length;

      if (playableIndexes.includes(candidate)) {
        return candidate;
      }
    }

    return playableIndexes[0] ?? -1;
  };

  const switchToTrack = async (
    index: number,
    markCurrentSkipped = true,
    queueOverride?: Track[],
    moodOverride?: MoodName,
    roomNameOverride?: string,
    rememberPrevious = true
  ) => {
    const queue =
      queueOverride && queueOverride.length > 0
        ? queueOverride
        : playerTracksRef.current;

    const track = queue[index];

    if (!track || !extractYouTubeVideoId(track.audioUrl)) {
      setNotice(
        track
          ? `"${track.title}" is not playable right now.`
          : 'That track is unavailable.'
      );
      return;
    }

    const oldIndex = trackIndexRef.current;
    const oldTrack = currentTrackRef.current;
    const hadProgress = readPlayerTime() > 0;

    if (historySongIdRef.current) {
      await finishListeningSession(
        false,
        Boolean(markCurrentSkipped && hadProgress)
      );
    }

    if (
      rememberPrevious &&
      playerStarted &&
      oldTrack &&
      (oldTrack.id !== track.id || oldIndex !== index)
    ) {
      playHistoryRef.current.push(oldIndex);
      if (playHistoryRef.current.length > 50) {
        playHistoryRef.current.shift();
      }
    }

    if (queueOverride && queueOverride.length > 0) {
      setActiveQueue(queueOverride);
      setActiveMoodName(moodOverride ?? track.mood);
      setActiveRoomName(
        roomNameOverride ?? selectedPlaylist?.name ?? 'Mood mix'
      );
      playerTracksRef.current = queueOverride;
    }

    setTrackIndex(index);
    trackIndexRef.current = index;
    currentTrackRef.current = track;
    setIsPlaying(false);
    isPlayingRef.current = false;

    loadTrackIntoPlayer(track, true);
  };

  const playViewedRoom = () => {
    if (viewedTracks.length === 0) {
      setNotice('No playable songs were found in this room.');
      return;
    }

    const firstPlayable = viewedTracks.findIndex(
      (track) => Boolean(extractYouTubeVideoId(track.audioUrl))
    );

    if (firstPlayable === -1) {
      setNotice('No playable songs were found in this room.');
      return;
    }

    void switchToTrack(
      firstPlayable,
      true,
      viewedTracks,
      selectedMood,
      selectedPlaylist?.name ?? 'Mood mix'
    );
  };

  const advanceTrack = (
    direction: 1 | -1,
    automatic = false
  ) => {
    const queue = playerTracksRef.current;

    if (direction === -1 && playHistoryRef.current.length > 0) {
      const previousIndex = playHistoryRef.current.pop();
      if (previousIndex != null && queue[previousIndex]) {
        void switchToTrack(
          previousIndex,
          !automatic,
          undefined,
          undefined,
          undefined,
          false
        );
        return;
      }
    }

    const nextIndex = findPlayableTrack(
      direction,
      queue,
      trackIndexRef.current
    );

    if (nextIndex === -1) {
      setNotice('No playable songs were found in the active queue.');
      return;
    }

    void switchToTrack(
      nextIndex,
      !automatic,
      undefined,
      undefined,
      undefined,
      direction === 1
    );
  };

  advanceTrackRef.current = advanceTrack;

  const nextTrack = () => advanceTrack(1, false);
  const previousTrack = () => advanceTrack(-1, false);

  const selectViewedTrack = (index: number) => {
    void switchToTrack(
      index,
      true,
      viewedTracks,
      selectedMood,
      selectedPlaylist?.name ?? 'Mood mix'
    );
  };

  const toggleShuffle = () => {
    const next = !shuffleEnabledRef.current;
    shuffleEnabledRef.current = next;
    setShuffleEnabled(next);
    setNotice(`Shuffle ${next ? 'on' : 'off'}.`);
  };

  const seekToSeconds = (nextSeconds: number) => {
    if (
      !playerStarted ||
      !playerReadyRef.current ||
      !youtubePlayerRef.current ||
      totalSeconds <= 0
    ) {
      return;
    }

    const target = Math.max(
      0,
      Math.min(totalSeconds, Number(nextSeconds) || 0)
    );

    setSeekPreviewSeconds(target);
    setCurrentSeconds(target);

    try {
      youtubePlayerRef.current.seekTo?.(target, true);
    } catch (error) {
      console.error('Could not seek player:', error);
      setNotice('The player could not seek to that position.');
    }

    // Let the real YouTube time take over again after the seek settles.
    window.setTimeout(() => {
      setSeekPreviewSeconds(null);
    }, 250);
  };

  const setPlayerVolume = (nextVolume: number) => {
    const normalized = Math.max(0, Math.min(100, nextVolume));
    setVolume(normalized);

    try {
      youtubePlayerRef.current?.setVolume?.(normalized);

      if (normalized > 0 && isMuted) {
        youtubePlayerRef.current?.unMute?.();
        setIsMuted(false);
      }
    } catch (error) {
      console.error('Could not set player volume:', error);
    }
  };

  const toggleMute = () => {
    try {
      if (isMuted) {
        youtubePlayerRef.current?.unMute?.();
        youtubePlayerRef.current?.setVolume?.(volume);
        setIsMuted(false);
      } else {
        youtubePlayerRef.current?.mute?.();
        setIsMuted(true);
      }
    } catch (error) {
      console.error('Could not toggle mute:', error);
    }
  };

  const togglePlayback = () => {
    if (!playerStarted) {
      if (activeQueue.length === 0) {
        const currentIndex = Math.max(
          0,
          viewedTracks.findIndex(
            (track) => track.title === current.title
          )
        );

        void switchToTrack(
          currentIndex,
          false,
          viewedTracks,
          selectedMood,
          selectedPlaylist?.name ?? 'Mood mix'
        );
        return;
      }

      const track = currentTrackRef.current ?? current;
      if (!loadTrackIntoPlayer(track, true)) return;
      return;
    }

    const player = youtubePlayerRef.current;

    if (!playerReadyRef.current || !player) {
      const videoId = extractYouTubeVideoId(
        currentTrackRef.current?.audioUrl ?? current.audioUrl
      );

      if (videoId) {
        pendingVideoRef.current = { videoId, autoplay: true };
      }
      return;
    }

    try {
      if (isPlayingRef.current) {
        player.pauseVideo?.();
      } else {
        player.playVideo?.();
      }
    } catch (error) {
      console.error('Could not toggle playback:', error);
      setNotice('The player could not change playback state.');
    }
  };

  const toggleFavorite = async () => {
    if (
      !current.id ||
      !Number.isFinite(userId)
    ) {
      setNotice(
        'This track cannot be added to favorites.'
      );
      return;
    }

    const isFavorite =
      likedSongIds.has(current.id);

    try {
      if (isFavorite) {
        await apiRequest(
          `/users/${userId}/liked-songs/${current.id}`,
          { method: 'DELETE' }
        );
      } else {
        await apiRequest(
          `/users/${userId}/liked-songs`,
          {
            method: 'POST',
            body: JSON.stringify({
              song_id: current.id,
            }),
          }
        );
      }

      setLikedSongIds(
        (previous) => {
          const next =
            new Set(previous);

          if (isFavorite) {
            next.delete(
              current.id as number
            );
          } else {
            next.add(
              current.id as number
            );
          }

          return next;
        }
      );

      setNotice(
        isFavorite
          ? `${current.title} removed from favorites.`
          : `${current.title} added to favorites.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not update favorites.'
      );
    }
  };

  // Search explicitly creates a single-track playback request.
  useEffect(() => {
    if (
      !selectedPlaylist?.id.startsWith('single-') ||
      viewedTracks.length === 0
    ) {
      return;
    }

    const requestedIndex = viewedTracks.findIndex(
      (track) => Boolean(extractYouTubeVideoId(track.audioUrl))
    );

    if (requestedIndex >= 0) {
      void switchToTrack(
        requestedIndex,
        true,
        viewedTracks,
        selectedMood,
        selectedPlaylist.name
      );
    }
  }, [selectedPlaylist?.id]);

  playerStateHandlerRef.current = (state: number) => {
    const YT = (window as any).YT;
    const states = YT?.PlayerState ?? {
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5,
    };

    if (state === states.PLAYING) {
      setIsPlaying(true);
      isPlayingRef.current = true;
      const track = currentTrackRef.current;
      if (track) beginListeningSession(track);
      return;
    }

    if (state === states.PAUSED) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      void persistListeningProgress(false, false);
      return;
    }

    if (state === states.ENDED) {
      setIsPlaying(false);
      isPlayingRef.current = false;

      void (async () => {
        await finishListeningSession(true, false);
        advanceTrackRef.current(1, true);
      })();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let createdPlayer: any = null;

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !playerContainerRef.current) return;

        playerContainerRef.current.innerHTML = '';
        const mount = document.createElement('div');
        playerContainerRef.current.appendChild(mount);

        createdPlayer = new YT.Player(mount, {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (cancelled) return;

              youtubePlayerRef.current = event.target;
              playerReadyRef.current = true;
              setPlayerReady(true);

              try {
                event.target.setVolume?.(volume);
                if (isMuted) event.target.mute?.();
              } catch {
                // Player is ready enough for playback even if volume setup fails.
              }

              const pending = pendingVideoRef.current;
              if (pending) {
                pendingVideoRef.current = null;

                if (pending.autoplay) {
                  event.target.loadVideoById?.(pending.videoId);
                } else {
                  event.target.cueVideoById?.(pending.videoId);
                }
              }
            },
            onStateChange: (event: any) => {
              playerStateHandlerRef.current(event.data);
            },
            onError: () => {
              setIsPlaying(false);
              isPlayingRef.current = false;
              setNotice('YouTube could not play this track. Try another song.');
            },
          },
        });

        youtubePlayerRef.current = createdPlayer;
      })
      .catch((error) => {
        console.error('YouTube API failed to load:', error);
        setNotice('The YouTube player could not be loaded.');
      });

    return () => {
      cancelled = true;
      playerReadyRef.current = false;
      setPlayerReady(false);

      try {
        createdPlayer?.destroy?.();
      } catch {
        // Ignore player teardown errors.
      }

      youtubePlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!playerReadyRef.current || !playerStarted) return;

      const seconds = readPlayerTime();
      const duration = readPlayerDuration();

      setCurrentSeconds(seconds);
      if (duration > 0) setDurationSeconds(duration);

      if (
        isPlayingRef.current &&
        seconds >= lastPersistedSecondRef.current + 10
      ) {
        void persistListeningProgress(false, false);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [playerStarted, userId]);

  useEffect(() => {
    return () => {
      if (historySongIdRef.current) {
        void persistListeningProgress(false, false);
      }
    };
  }, []);

  const isCurrentFavorite =
    Boolean(
      current.id &&
      likedSongIds.has(current.id)
    );

  const isCurrentDownloaded =
    Boolean(
      current.id &&
      downloadedSongIds.has(current.id)
    );

  const playerFrame = (
    <div
      ref={playerContainerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
        border: 0,
        overflow: 'hidden',
      }}
    />
  );

  if (compact) {
    return (
      <>
        {playerFrame}

        {playerStarted && (
          <aside
            aria-label="Background player"
            data-testid="mini-player"
            style={{
              position: 'fixed',
              right: 22,
              bottom: 22,
              zIndex: 90,
              width: 'min(430px, calc(100vw - 32px))',
              padding: '13px 15px',
              border: `1px solid ${activeMood.color}55`,
              background:
                'rgba(12, 13, 18, 0.96)',
              boxShadow:
                '0 18px 60px rgba(0,0,0,.45)',
              backdropFilter:
                'blur(18px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setLocation('/home')
                }
                title="Open Now playing"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    color: activeMood.color,
                    fontSize: 10,
                    letterSpacing: '.15em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Now playing · {activeRoomName}
                </span>

                <strong
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 14,
                  }}
                >
                  {current.title}
                </strong>

                <span
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#9d99a3',
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {current.artist} · {formatDuration(displayedSeconds)} / {formatDuration(totalSeconds)}
                </span>
              </button>

              <button
                className="player-control"
                onClick={previousTrack}
                aria-label="Previous track"
                data-testid="mini-player-previous"
              >
                <SkipBack size={17} />
              </button>

              <button
                className="play-button"
                onClick={togglePlayback}
                aria-label={
                  isPlaying
                    ? 'Pause'
                    : 'Play'
                }
                data-testid="mini-player-play-pause"
                style={{
                  width: 38,
                  height: 38,
                  minWidth: 38,
                }}
              >
                {isPlaying ? (
                  <Pause
                    size={16}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    size={16}
                    fill="currentColor"
                  />
                )}
              </button>

              <button
                className="player-control"
                onClick={nextTrack}
                aria-label="Next track"
                data-testid="mini-player-next"
              >
                <SkipForward size={17} />
              </button>

              <button
                className="player-control"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                data-testid="mini-player-volume"
                title={`Volume ${isMuted ? 0 : volume}%`}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>
            </div>

            <div
              style={{
                marginTop: 8,
              }}
            >
              <input
                type="range"
                min={0}
                max={Math.max(totalSeconds, 1)}
                step={0.1}
                value={Math.min(displayedSeconds, Math.max(totalSeconds, 1))}
                onChange={(event) =>
                  seekToSeconds(Number(event.currentTarget.value))
                }
                disabled={!playerStarted || !playerReady || totalSeconds <= 0}
                aria-label="Seek through current song"
                data-testid="mini-player-seek"
                title={`Seek: ${formatDuration(displayedSeconds)} / ${formatDuration(totalSeconds)}`}
                style={{
                  width: '100%',
                  margin: 0,
                  cursor:
                    playerStarted && playerReady && totalSeconds > 0
                      ? 'pointer'
                      : 'not-allowed',
                  accentColor: activeMood.color,
                }}
              />
            </div>
          </aside>
        )}
      </>
    );
  }

  return (
    <>
      {playerFrame}

      <section
        className="page"
        style={moodStyle(viewedMood)}
      >
        <div className="mood-hero animate-rise">
          <div className="hero-copy">
            <div className="eyebrow">
              Your room tonight / {selectedMood} / {selectedPlaylist?.name ?? 'Mood mix'}
            </div>

            <h1>{viewedMood.line}</h1>
            <p>{viewedMood.description}</p>

            <div className="hero-links">
              <button
                className="solid-button"
                onClick={playViewedRoom}
                data-testid="button-hero-play"
              >
                <Play
                  size={15}
                  fill="currentColor"
                />
                {' '}
                {activeQueue.length > 0 &&
                activeRoomName ===
                  (selectedPlaylist?.name ??
                    'Mood mix')
                  ? 'Restart this room'
                  : 'Play this room'}
              </button>

              <button
                className="outline-button"
                onClick={() =>
                  document
                    .getElementById(
                      'mood-player'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                    })
                }
                data-testid="button-scroll-player"
              >
                <Volume2 size={15} />
                {' '}
                See the needle
              </button>
            </div>
          </div>

          <RecordCover
            mood={viewedMood}
            label={selectedMood}
          />
        </div>

        <div
          className="player-grid animate-rise-2"
          id="mood-player"
        >
          <div className="player-panel">
            <div className="now-playing">
              <div>
                <div
                  className="eyebrow"
                  style={{
                    color:
                      activeMood.color,
                  }}
                >
                  Now on the turntable
                </div>

                <div
                  className="track-title"
                  data-testid="text-current-track"
                >
                  {current.title}
                </div>

                <div className="track-artist">
                  {current.artist}
                  {playerStarted &&
                    activeRoomName !==
                      (selectedPlaylist?.name ??
                        'Mood mix') &&
                    ` · still playing from ${activeRoomName}`}
                </div>
              </div>
            </div>

            <div className="progress-wrap">
              <div
                className="wave-row"
                aria-hidden="true"
              >
                {Array.from({
                  length: 34,
                }).map((_, index) => (
                  <span
                    key={index}
                    style={{
                      '--bar': `${
                        .25 +
                        ((index * 17) %
                          70) /
                          100
                      }`,
                    } as CSSProperties}
                  />
                ))}
              </div>

              <div
                className="progress-line"
                style={{
                  position: 'relative',
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'visible',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: `${progressPercent}%`,
                    height: 3,
                    background: activeMood.color,
                    pointerEvents: 'none',
                  }}
                />

                <input
                  type="range"
                  min={0}
                  max={Math.max(totalSeconds, 1)}
                  step={0.1}
                  value={Math.min(displayedSeconds, Math.max(totalSeconds, 1))}
                  onChange={(event) =>
                    seekToSeconds(Number(event.currentTarget.value))
                  }
                  disabled={!playerStarted || !playerReady || totalSeconds <= 0}
                  aria-label="Seek through current song"
                  data-testid="player-seek"
                  title={`Seek: ${formatDuration(displayedSeconds)} / ${formatDuration(totalSeconds)}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: 22,
                    margin: 0,
                    opacity: 0.9,
                    cursor:
                      playerStarted && playerReady && totalSeconds > 0
                        ? 'pointer'
                        : 'not-allowed',
                    accentColor: activeMood.color,
                  }}
                />
              </div>

              <div className="progress-times">
                <span>
                  {formatDuration(
                    displayedSeconds
                  )}
                </span>
                <span>
                  {formatDuration(totalSeconds)}
                </span>
              </div>
            </div>

            <div className="player-controls">
              <button
                className="player-control"
                onClick={toggleShuffle}
                aria-label={shuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
                aria-pressed={shuffleEnabled}
                data-testid="button-shuffle"
                title={shuffleEnabled ? 'Shuffle on' : 'Shuffle off'}
                style={
                  shuffleEnabled
                    ? {
                        color: activeMood.color,
                        borderColor: activeMood.color,
                        background: `${activeMood.color}18`,
                      }
                    : undefined
                }
              >
                <Shuffle size={18} />
              </button>

              <button
                className="player-control"
                onClick={previousTrack}
                aria-label="Previous track"
                data-testid="button-previous"
              >
                <SkipBack size={20} />
              </button>

              <button
                className="play-button"
                onClick={togglePlayback}
                aria-label={
                  isPlaying
                    ? 'Pause'
                    : 'Play'
                }
                data-testid="button-play-pause"
              >
                {isPlaying ? (
                  <Pause
                    size={19}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    size={19}
                    fill="currentColor"
                  />
                )}
              </button>

              <button
                className="player-control"
                onClick={nextTrack}
                aria-label="Next track"
                data-testid="button-next"
              >
                <SkipForward size={20} />
              </button>

              <button
                className="player-control"
                onClick={() =>
                  void toggleFavorite()
                }
                aria-label={
                  isCurrentFavorite
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                data-testid="button-favorite"
                title={
                  isCurrentFavorite
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
              >
                <Heart
                  size={18}
                  fill={
                    isCurrentFavorite
                      ? 'currentColor'
                      : 'none'
                  }
                />
              </button>

              {isPremium ? (
                <button
                  className="outline-button small-button"
                  onClick={() => void onDownload(current)}
                  disabled={!current.id || isCurrentDownloaded}
                  data-testid="button-download-current"
                  title={
                    isCurrentDownloaded
                      ? 'Already saved to downloads'
                      : 'Save to Premium downloads'
                  }
                >
                  <Download size={14} />
                  {isCurrentDownloaded ? 'Saved offline' : 'Save offline'}
                </button>
              ) : (
                <button
                  className="outline-button small-button"
                  onClick={() => {
                    setNotice(
                      'Unlock with Premium to save tracks to your downloads library.'
                    );
                    setLocation('/premium');
                  }}
                  data-testid="button-unlock-download-current"
                >
                  <LockKeyhole size={14} />
                  Unlock with Premium
                </button>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  minWidth: 120,
                }}
              >
                <button
                  className="player-control"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  data-testid="button-volume"
                  title={isMuted ? 'Unmute' : `Volume ${volume}%`}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={18} />
                  ) : (
                    <Volume2 size={18} />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={isMuted ? 0 : volume}
                  onChange={(event) =>
                    setPlayerVolume(Number(event.target.value))
                  }
                  aria-label="Player volume"
                  data-testid="input-volume"
                  style={{
                    width: 78,
                    accentColor: activeMood.color,
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="queue-panel">
            <div className="panel-heading">
              <h3>
                {selectedPlaylist?.name ??
                  `${selectedMood} mix`}
              </h3>
              <span>
                {viewedTracks.length} sides
              </span>
            </div>

            <div className="queue-list">
              {viewedTracks.map(
                (track, index) => (
                  <button
                    key={`${track.id ?? track.title}-${index}`}
                    className={`queue-item ${
                      track.id ===
                        current.id &&
                      activeRoomName ===
                        (selectedPlaylist?.name ??
                          'Mood mix')
                        ? 'current'
                        : ''
                    }`}
                    onClick={() =>
                      selectViewedTrack(
                        index
                      )
                    }
                    data-testid={`button-queue-track-${index}`}
                  >
                    <span className="queue-number">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <span>
                      <strong>
                        {track.title}
                      </strong>
                      <small>
                        {track.artist}
                      </small>
                    </span>

                    <span className="queue-duration">
                      {track.duration}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div
          className="hairline"
          style={{
            margin: '45px 0 24px',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <span className="muted">
            Not quite the room you meant?
          </span>

          <button
            className="outline-button small-button"
            onClick={() => {
              setLocation('/');
              setNotice(
                'The room is ready for a new feeling.'
              );
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              });
            }}
            data-testid="button-choose-another"
          >
            <RotateCcw size={14} />
            {' '}
            Choose another mood
          </button>
        </div>
      </section>
    </>
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

function PlaylistBuilder({
  onCreate,
  tracks,
  isPremium,
  setNotice,
}: {
  onCreate: (playlist: Playlist) => Promise<void> | void;
  tracks: Track[];
  isPremium: boolean;
  setNotice: (notice: string) => void;
}) {
  const [name, setName] = useState('');
  const [mood, setMood] = useState<MoodName>('Neutral');
  const [vibe, setVibe] = useState('');
  const [songQuery, setSongQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selected = tracks.filter((track) =>
    selectedTracks.includes(track.title)
  );

  const matches = tracks.filter((track) => {
    const value =
      `${track.title} ${track.artist}`.toLowerCase();

    return (
      !songQuery.trim() ||
      value.includes(songQuery.trim().toLowerCase())
    );
  }).slice(0, 6);

  const toggleTrack = (title: string) => {
    setSelectedTracks((current) =>
      current.includes(title)
        ? current.filter((track) => track !== title)
        : [...current, title]
    );
  };

  const suggest = () => {
    setIsThinking(true);

    window.setTimeout(() => {
      setSuggestions(
        vibeNames(mood, vibe, selected)
      );
      setIsThinking(false);
    }, 350);
  };

  const priorityCurate = () => {
    if (!isPremium) {
      setNotice('Unlock with Premium to use priority playlist curation.');
      return;
    }

    const tokens = vibe
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);

    const moodPool = tracks.filter(
      (track) => track.mood === mood
    );

    const source =
      moodPool.length >= 5
        ? moodPool
        : tracks;

    const ranked = [...source]
      .map((track, index) => {
        const searchable =
          `${track.title} ${track.artist} ${track.genre ?? ''} ${track.language ?? ''}`
            .toLowerCase();

        const tokenScore = tokens.reduce(
          (score, token) =>
            score + (searchable.includes(token) ? 5 : 0),
          0
        );

        const moodScore =
          track.mood === mood ? 20 : 0;

        const playableScore =
          track.audioUrl ? 3 : 0;

        return {
          track,
          score:
            moodScore +
            tokenScore +
            playableScore -
            index * 0.001,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(10, source.length))
      .map(({ track }) => track);

    const curatedTitles = ranked.map(
      (track) => track.title
    );

    setSelectedTracks(curatedTitles);

    const curatedNames =
      vibeNames(mood, vibe, ranked);

    setSuggestions(curatedNames);

    if (!name.trim()) {
      setName(curatedNames[0]);
    }

    setNotice(
      `Priority curation selected ${ranked.length} ${mood.toLowerCase()} tracks for this room.`
    );
  };

  const create = async () => {
    const finalName =
      name.trim() || suggestions[0];

    if (!finalName || isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      await onCreate({
        id: `pending-${Date.now()}`,
        name: finalName,
        mood,
        count: selectedTracks.length,
        trackTitles: selectedTracks,
        description:
          vibe.trim() ||
          `A ${mood.toLowerCase()} room, made by you.`,
        isCustom: true,
      });

      setName('');
      setVibe('');
      setSongQuery('');
      setSelectedTracks([]);
      setSuggestions([]);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="playlist-builder animate-rise-2">
      <div className="builder-copy">
        <div className="eyebrow">Make a new record / AI naming desk</div>
        <h2>Build a playlist<br /><em>from the feeling up.</em></h2>
        <p>Choose a mood, collect a few songs, and let moobot suggest a name that fits the room.</p>

        <label className="field-label" htmlFor="playlist-name">
          Playlist name <span>optional</span>
        </label>

        <input
          id="playlist-name"
          className="builder-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Leave blank for an AI name"
          data-testid="input-new-playlist-name"
        />

        <label className="field-label" htmlFor="playlist-vibe">
          Describe the vibe
        </label>

        <textarea
          id="playlist-vibe"
          className="builder-input builder-textarea"
          value={vibe}
          onChange={(event) => setVibe(event.target.value)}
          placeholder="Late-night drive, messy dancing, quiet rain..."
          data-testid="input-playlist-vibe"
        />

        <div className="builder-fields">
          <label className="field-label" htmlFor="playlist-mood">
            Mood
          </label>

          <select
            id="playlist-mood"
            className="builder-input"
            value={mood}
            onChange={(event) =>
              setMood(event.target.value as MoodName)
            }
            data-testid="select-playlist-mood"
          >
            {moods.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>

          <button
            className="outline-button builder-ai-button"
            onClick={suggest}
            disabled={isThinking || isCreating}
            data-testid="button-suggest-playlist-name"
          >
            <WandSparkles size={15} />
            {isThinking
              ? 'moobot is thinking…'
              : 'Ask moobot for names'}
          </button>

          {isPremium ? (
            <button
              className="solid-button builder-ai-button"
              onClick={priorityCurate}
              disabled={isCreating || tracks.length === 0}
              data-testid="button-priority-curate"
            >
              <Crown size={15} />
              Priority curate
            </button>
          ) : (
            <Link
              href="/premium"
              className="outline-button builder-ai-button"
              data-testid="link-unlock-priority-curation"
            >
              <LockKeyhole size={15} />
              Unlock with Premium
            </Link>
          )}
        </div>

        {suggestions.length > 0 && (
          <div
            className="ai-suggestions"
            aria-label="moobot playlist name suggestions"
          >
            <span className="ai-label">
              <Sparkles size={13} /> moobot suggests
            </span>

            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                className={`suggestion-chip ${
                  name === suggestion ? 'selected' : ''
                }`}
                onClick={() => setName(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="builder-tracks">
        <div className="panel-heading">
          <h3>Add songs</h3>
          <span>{selectedTracks.length} selected</span>
        </div>

        <input
          className="builder-input"
          value={songQuery}
          onChange={(event) => setSongQuery(event.target.value)}
          placeholder="Search songs or artists"
          aria-label="Search songs to add"
          data-testid="input-builder-song-search"
        />

        <div className="builder-track-list">
          {matches.map((track) => {
            const isSelected =
              selectedTracks.includes(track.title);

            return (
              <button
                key={`${track.id ?? track.title}`}
                className={`builder-track ${
                  isSelected ? 'selected' : ''
                }`}
                onClick={() => toggleTrack(track.title)}
                data-testid={`button-builder-track-${track.title
                  .toLowerCase()
                  .replaceAll(' ', '-')}`}
              >
                <span className="builder-track-check">
                  {isSelected ? (
                    <Check size={13} />
                  ) : (
                    <Plus size={13} />
                  )}
                </span>

                <span>
                  <strong>{track.title}</strong>
                  <small>
                    {track.artist} / {track.mood}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="solid-button builder-create-button"
          onClick={create}
          disabled={
            isCreating ||
            (!name.trim() && suggestions.length === 0)
          }
          data-testid="button-create-playlist"
        >
          <Plus size={15} />
          {isCreating
            ? 'Saving playlist…'
            : 'Create playlist'}
        </button>
      </div>
    </section>
  );
}

function PlaylistsPage({
  library,
  tracks,
  openPlaylist,
  setNotice,
  onCreate,
  onDelete,
  isPremium,
}: {
  library: Playlist[];
  tracks: Track[];
  openPlaylist: (playlist: Playlist) => void;
  setNotice: (notice: string) => void;
  onCreate: (playlist: Playlist) => Promise<void> | void;
  onDelete: (playlist: Playlist) => Promise<void> | void;
  isPremium: boolean;
}) {
  const open = (playlist: Playlist) => {
    openPlaylist(playlist);
    setNotice(`Opening ${playlist.name}.`);
  };

  return (
    <section className="page">
      <div className="page-heading animate-rise">
        <div>
          <div className="eyebrow">The record shelf / 005</div>
          <h1>My<br /><em>playlists</em></h1>
        </div>
        <Link href="/restore" className="outline-button" data-testid="link-restore-from-playlists">
          <RotateCcw size={15} /> Restore a playlist
        </Link>
      </div>

      <PlaylistBuilder
        tracks={tracks}
        onCreate={onCreate}
        isPremium={isPremium}
        setNotice={setNotice}
      />

      <div className="library-grid animate-rise-2">
        {library.map((playlist) => (
          <article className="library-card" key={playlist.id} data-testid={`card-playlist-${playlist.id}`}>
            <PlaylistCover playlist={playlist} />
            <div className="cover-meta">
              <div>
                <h2>{playlist.name}</h2>
                <p>{playlist.trackTitles.length} tracks / {playlist.description}</p>
              </div>
              <Disc3 size={17} color={moodFor(playlist.mood).color} />
            </div>
            <div className="card-actions">
              <button className="solid-button small-button" onClick={() => open(playlist)} data-testid={`button-open-playlist-${playlist.id}`}>
                <Play size={13} fill="currentColor" /> Open
              </button>

              {playlist.backendId && (
                <button
                  className="icon-button"
                  onClick={() => void onDelete(playlist)}
                  aria-label={`Delete ${playlist.name}`}
                  data-testid={`button-delete-playlist-${playlist.id}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {library.length === 0 && (
        <div className="empty-state" style={{ marginTop: 15 }}>
          <h2>The shelf is empty.</h2>
          <p>Create a playlist and it will be saved to your MOOSIC account.</p>
        </div>
      )}
    </section>
  );
}

function RestorePage({
  deletedPlaylists,
  setNotice,
  onRestore,
  onRestoreAll,
}: {
  deletedPlaylists: Playlist[];
  setNotice: (notice: string) => void;
  onRestore: (playlist: Playlist) => Promise<void> | void;
  onRestoreAll: () => Promise<void> | void;
}) {
  return (
    <section className="page">
      <div className="eyebrow animate-rise">The back room / 003</div>
      <div className="restore-panel animate-rise-2" style={{ marginTop: 26 }}>
        <div className="restore-disc" />
        <h1>Nothing is<br /><em>ever really gone.</em></h1>

        {deletedPlaylists.length > 0 ? (
          <>
            <p>
              {deletedPlaylists.length} deleted{' '}
              {deletedPlaylists.length === 1 ? 'record is' : 'records are'} waiting here.
              Choose what deserves another spin.
            </p>

            <div className="restore-list">
              {deletedPlaylists.map((playlist) => (
                <div className="restore-item" key={playlist.id}>
                  <PlaylistCover playlist={playlist} />
                  <div className="restore-item-copy">
                    <strong>{playlist.name}</strong>
                    <span>{playlist.trackTitles.length} tracks / {playlist.mood}</span>
                  </div>
                  <button
                    className="solid-button small-button"
                    onClick={() => void onRestore(playlist)}
                    data-testid={`button-restore-playlist-${playlist.id}`}
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                </div>
              ))}
            </div>

            <button
              className="outline-button small-button"
              onClick={() => void onRestoreAll()}
              data-testid="button-restore-all"
            >
              <RotateCcw size={14} /> Restore all
            </button>
          </>
        ) : (
          <>
            <p>Your deleted records will wait here for a little while. The back room is empty for now, but it knows how to hold a place.</p>
            <Link href="/playlists" className="outline-button" data-testid="link-restore-back-library">
              <ListMusic size={15} /> Back to my playlists
            </Link>
          </>
        )}
      </div>

      <div style={{ marginTop: 32, color: '#777481', fontSize: 13 }} className="animate-rise-3">
        <span style={{ color: '#f1bc46' }}>A small promise:</span> accidental taps do not get the last word.
      </div>
    </section>
  );
}

function DownloadsPage({
  isPremium,
  downloads,
  tracks,
  playTrack,
  onRemove,
}: {
  isPremium: boolean;
  downloads: BackendDownload[];
  tracks: Track[];
  playTrack: (track: Track) => void;
  onRemove: (songId: number) => Promise<void> | void;
}) {
  if (!isPremium) {
    return (
      <section className="page">
        <div className="eyebrow animate-rise">
          Offline library / Premium
        </div>

        <div
          className="animate-rise-2"
          style={{
            maxWidth: 720,
            marginTop: 32,
            padding: '46px 42px',
            border: '1px solid rgba(241,188,70,.45)',
            borderRadius: 28,
            background:
              'linear-gradient(145deg, rgba(241,188,70,.07), rgba(255,255,255,.02))',
          }}
        >
          <Download size={28} color="#f1bc46" />

          <h1
            className="section-title"
            style={{ marginTop: 20 }}
          >
            Take the room <em>with you.</em>
          </h1>

          <p
            style={{
              color: '#aaa4ae',
              maxWidth: 540,
              lineHeight: 1.6,
            }}
          >
            Premium listeners can save tracks to their MOOSIC downloads
            library and manage them from one place.
          </p>

          <Link
            href="/premium"
            className="solid-button"
            style={{
              display: 'inline-flex',
              marginTop: 18,
            }}
            data-testid="link-unlock-downloads"
          >
            <Crown size={15} />
            Unlock with Premium
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-heading animate-rise">
        <div>
          <div className="eyebrow">
            Offline library / Premium
          </div>
          <h1>
            Your<br /><em>downloads</em>
          </h1>
        </div>

        <Link
          href="/search"
          className="outline-button"
          data-testid="link-find-downloads"
        >
          <Search size={15} />
          Find tracks
        </Link>
      </div>

      {downloads.length > 0 ? (
        <div
          className="result-section animate-rise-2"
          style={{ marginTop: 24 }}
        >
          {downloads.map((download, index) => {
            const track =
              tracks.find(
                (candidate) =>
                  candidate.id === download.song_id
              );

            return (
              <div
                className="result-row"
                key={download.id}
              >
                <div className="result-row-main">
                  <strong>{download.title}</strong>
                  <small>
                    {download.artist} / saved to Premium downloads
                  </small>
                </div>

                <div className="result-row-actions">
                  <button
                    className="icon-button"
                    disabled={!track}
                    onClick={() => {
                      if (track) {
                        playTrack(track);
                      }
                    }}
                    aria-label={`Play ${download.title}`}
                    data-testid={`button-play-download-${index}`}
                  >
                    <Play
                      size={14}
                      fill="currentColor"
                    />
                  </button>

                  <button
                    className="outline-button small-button"
                    onClick={() =>
                      void onRemove(download.song_id)
                    }
                    data-testid={`button-remove-download-${index}`}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="empty-state animate-rise-2"
          style={{ marginTop: 24 }}
        >
          <Download size={26} />
          <h2>No downloads yet.</h2>
          <p>
            Search the catalogue and save tracks to your Premium downloads library.
          </p>

          <Link
            href="/search"
            className="solid-button small-button"
          >
            Find a track
          </Link>
        </div>
      )}
    </section>
  );
}

function SearchPage({
  library,
  tracks,
  playTrack,
  openPlaylist,
  setNotice,
  addTrackToPlaylist,
  isPremium,
  downloadedSongIds,
  onDownload,
}: {
  library: Playlist[];
  tracks: Track[];
  playTrack: (track: Track) => void;
  openPlaylist: (playlist: Playlist) => void;
  setNotice: (notice: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void> | void;
  isPremium: boolean;
  downloadedSongIds: Set<number>;
  onDownload: (track: Track) => Promise<void> | void;
}) {
  const userPlaylists = library.filter(
    (playlist) => Boolean(playlist.backendId)
  );

  const [query, setQuery] = useState('');
  const [targetPlaylistId, setTargetPlaylistId] = useState(
    userPlaylists[0]?.id ?? ''
  );

  useEffect(() => {
    if (
      targetPlaylistId &&
      userPlaylists.some(
        (playlist) => playlist.id === targetPlaylistId
      )
    ) {
      return;
    }

    setTargetPlaylistId(
      userPlaylists[0]?.id ?? ''
    );
  }, [library, targetPlaylistId]);

  const normalized =
    query.trim().toLowerCase();

  const filteredTracks = useMemo(
    () =>
      normalized
        ? tracks.filter((track) =>
            `${track.title} ${track.artist} ${track.mood}`
              .toLowerCase()
              .includes(normalized)
          )
        : tracks,
    [normalized, tracks]
  );

  const filteredPlaylists = useMemo(
    () =>
      normalized
        ? library.filter((playlist) =>
            `${playlist.name} ${playlist.description} ${playlist.mood}`
              .toLowerCase()
              .includes(normalized)
          )
        : library,
    [normalized, library]
  );

  const hasResults =
    filteredTracks.length > 0 ||
    filteredPlaylists.length > 0;

  return (
    <section className="page">
      <div className="eyebrow animate-rise">The listening desk / 004</div>
      <h1 className="section-title animate-rise" style={{ margin: '15px 0 0' }}>
        Find a feeling,<br /><em>not just a song.</em>
      </h1>

      <label className="search-shell animate-rise-2">
        <Search />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="search-input"
          placeholder="Try “Adele”, “Hindi”, or “Happy”"
          aria-label="Search MOOSIC"
          data-testid="input-search"
        />
      </label>

      <div className="search-save-bar animate-rise-2">
        <span>Save songs to</span>

        <select
          value={targetPlaylistId}
          onChange={(event) =>
            setTargetPlaylistId(event.target.value)
          }
          aria-label="Playlist to add songs to"
          data-testid="select-search-playlist"
          disabled={userPlaylists.length === 0}
        >
          {userPlaylists.length === 0 ? (
            <option value="">Create a playlist first</option>
          ) : (
            userPlaylists.map((playlist) => (
              <option value={playlist.id} key={playlist.id}>
                {playlist.name}
              </option>
            ))
          )}
        </select>

        <span className="muted">
          {userPlaylists.length > 0
            ? 'Songs added here are saved to your account.'
            : 'Create a playlist in My playlists before adding songs.'}
        </span>
      </div>

      {hasResults ? (
        <div className="result-columns animate-rise-3">
          <div className="result-section">
            <h2>Songs / {filteredTracks.length}</h2>

            {filteredTracks.map((track, index) => (
              <div className="result-row" key={`${track.id ?? track.title}-${index}`}>
                <div className="result-row-main">
                  <strong>{track.title}</strong>
                  <small>{track.artist} / {track.mood}</small>
                </div>

                <div className="result-row-actions">
                  <button
                    className="icon-button"
                    onClick={() => {
                      playTrack(track);
                      setNotice(`Playing ${track.title}.`);
                    }}
                    aria-label={`Play ${track.title}`}
                    data-testid={`button-search-track-${index}`}
                  >
                    <Play size={14} fill="currentColor" />
                  </button>

                  <button
                    className="solid-button small-button"
                    disabled={!targetPlaylistId || !track.id}
                    onClick={() =>
                      void addTrackToPlaylist(
                        targetPlaylistId,
                        track
                      )
                    }
                    data-testid={`button-add-search-track-${index}`}
                  >
                    <Plus size={13} /> Add
                  </button>

                  {isPremium ? (
                    <button
                      className="outline-button small-button"
                      disabled={
                        !track.id ||
                        downloadedSongIds.has(track.id)
                      }
                      onClick={() =>
                        void onDownload(track)
                      }
                      data-testid={`button-download-search-track-${index}`}
                    >
                      <Download size={13} />
                      {track.id &&
                      downloadedSongIds.has(track.id)
                        ? 'Saved offline'
                        : 'Save offline'}
                    </button>
                  ) : (
                    <Link
                      href="/premium"
                      className="outline-button small-button"
                      data-testid={`link-unlock-download-search-${index}`}
                    >
                      <LockKeyhole size={13} />
                      Unlock with Premium
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="result-section">
            <h2>Playlists / {filteredPlaylists.length}</h2>

            {filteredPlaylists.map((playlist, index) => (
              <div className="result-row" key={playlist.id}>
                <div className="result-row-main">
                  <strong>{playlist.name}</strong>
                  <small>{playlist.mood} / {playlist.trackTitles.length} tracks</small>
                </div>
                <button
                  className="icon-button"
                  onClick={() => {
                    openPlaylist(playlist);
                    setNotice(`Opening ${playlist.name}.`);
                  }}
                  aria-label={`Open ${playlist.name}`}
                  data-testid={`button-search-playlist-${index}`}
                >
                  <Disc3 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state animate-rise-3">
          <h2>That record isn’t on the shelf.</h2>
          <p>Try a song, artist, mood, or playlist title. The best finds are sometimes one letter away.</p>
          <button className="outline-button small-button" onClick={() => setQuery('')} data-testid="button-clear-search">
            <X size={14} /> Clear search
          </button>
        </div>
      )}
    </section>
  );
}

function PremiumPage({
  premiumStatus,
  onUpgrade,
  onCancel,
  isBusy,
}: {
  premiumStatus: PremiumStatus | null;
  onUpgrade: (paymentMethod: 'test_success' | 'test_failure') => Promise<boolean>;
  onCancel: () => Promise<void> | void;
  isBusy: boolean;
}) {
  const isPremium = Boolean(premiumStatus?.is_premium);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');

  const premiumFeatures = [
    { label: 'Unlimited custom themes', icon: Palette },
    { label: 'Offline downloadable tracks', icon: Download },
    { label: 'Priority playlist curation', icon: Sparkles },
  ];

  const freeFeatures = [
    { label: 'Basic moods and playlists', available: true },
    { label: 'Downloaded songs unavailable', available: false },
    { label: 'Premium themes unavailable', available: false },
  ];

  const resetCheckout = () => {
    setCardholderName('');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setCheckoutMessage('');
  };

  const closeCheckout = () => {
    if (isBusy) return;
    setCheckoutOpen(false);
    resetCheckout();
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const validateMockCard = () => {
    const digits = cardNumber.replace(/\D/g, '');
    const expiryMatch = expiry.match(/^(\d{2})\/(\d{2})$/);
    const cvvValid = /^\d{3,4}$/.test(cvv);

    if (!cardholderName.trim()) {
      return 'Enter a cardholder name.';
    }

    if (digits.length !== 16) {
      return 'Enter a 16-digit mock card number.';
    }

    if (!expiryMatch) {
      return 'Enter expiry in MM/YY format.';
    }

    const month = Number(expiryMatch[1]);
    if (month < 1 || month > 12) {
      return 'Expiry month must be between 01 and 12.';
    }

    if (!cvvValid) {
      return 'Enter a 3 or 4 digit CVV.';
    }

    return '';
  };

  const completeMockPayment = async () => {
    const validationError = validateMockCard();

    if (validationError) {
      setCheckoutMessage(validationError);
      return;
    }

    setCheckoutMessage('');

    const success = await onUpgrade('test_success');

    if (success) {
      setCheckoutOpen(false);
      resetCheckout();
    } else {
      setCheckoutMessage(
        'The mock payment did not complete. Try again or simulate a failure.'
      );
    }
  };

  const simulateFailure = async () => {
    setCheckoutMessage('');

    const success = await onUpgrade('test_failure');

    if (!success) {
      setCheckoutMessage(
        'Mock payment failed as requested. No real payment was processed.'
      );
    }
  };

  return (
    <>
      <section
        className="page"
        style={{
          minHeight: 'calc(100vh - 130px)',
          maxWidth: 1180,
          margin: '0 auto',
        }}
      >
        <div
          className="animate-rise"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            marginTop: 34,
            marginBottom: 34,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 620 }}>
            <div
              className="eyebrow"
              style={{ color: '#f1bc46', marginBottom: 11 }}
            >
              MOOSIC PREMIUM / 007
            </div>

            <h1
              className="section-title"
              style={{
                fontSize: 'clamp(52px, 6vw, 82px)',
                lineHeight: .92,
                margin: 0,
              }}
            >
              Own the <em>room.</em>
            </h1>

            <p
              style={{
                maxWidth: 520,
                marginTop: 18,
                color: '#b6b0ba',
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              Unlock the premium layer of Moosic with better themes,
              download access, and a cleaner listening experience.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById('premium-plans')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="outline-button"
            data-testid="button-compare-plans"
            style={{
              borderRadius: 999,
              marginTop: 14,
            }}
          >
            {isPremium ? 'Premium active' : 'Compare plans'}
          </button>
        </div>

        <div
          id="premium-plans"
          className="animate-rise-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 22,
            alignItems: 'stretch',
          }}
        >
          <article
            style={{
              position: 'relative',
              border: '1px solid rgba(241,188,70,.76)',
              borderRadius: 28,
              padding: '34px 34px 30px',
              minHeight: 420,
              background:
                'linear-gradient(145deg, rgba(241,188,70,.09), rgba(255,255,255,.025))',
              boxShadow: isPremium
                ? '0 0 0 1px rgba(241,188,70,.18), 0 28px 80px rgba(0,0,0,.30)'
                : '0 25px 70px rgba(0,0,0,.25)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                color: '#f1bc46',
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                marginBottom: 18,
              }}
            >
              <Crown size={13} />
              MOOSIC PREMIUM
            </span>

            <h2
              style={{
                margin: 0,
                fontSize: 29,
                color: '#f3eedb',
              }}
            >
              The complete room
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 9,
                marginTop: 16,
                marginBottom: 9,
              }}
            >
              <strong
                style={{
                  fontSize: 49,
                  lineHeight: 1,
                  color: '#f3eedb',
                  fontWeight: 500,
                }}
              >
                Rs 299
              </strong>
              <span style={{ color: '#9f9aa4' }}>/mth</span>
            </div>

            <p
              style={{
                color: '#a9a3ad',
                lineHeight: 1.55,
                marginBottom: 26,
              }}
            >
              For listeners who want every part of Moosic to feel like theirs.
            </p>

            <div style={{ display: 'grid', gap: 13 }}>
              {premiumFeatures.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    color: '#e8e1ce',
                    fontSize: 14,
                  }}
                >
                  <Icon size={16} color="#f1bc46" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {isPremium ? (
              <div style={{ marginTop: 31 }}>
                <div
                  style={{
                    color: '#f1bc46',
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  ✓ Premium is active on this account.
                </div>
                <button
                  className="outline-button"
                  onClick={() => void onCancel()}
                  disabled={isBusy}
                  data-testid="button-cancel-premium"
                  style={{ width: '100%' }}
                >
                  {isBusy ? 'Updating…' : 'Cancel premium'}
                </button>
              </div>
            ) : (
              <button
                className="solid-button"
                onClick={() => {
                  resetCheckout();
                  setCheckoutOpen(true);
                }}
                disabled={isBusy}
                data-testid="button-upgrade-premium"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: 31,
                  minHeight: 49,
                  background: '#f2ecd6',
                  color: '#16121b',
                }}
              >
                Upgrade to premium
              </button>
            )}
          </article>

          <article
            style={{
              border: '1px solid rgba(255,255,255,.20)',
              borderRadius: 28,
              padding: '34px 34px 30px',
              minHeight: 420,
              background: 'rgba(255,255,255,.025)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                color: '#f1bc46',
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                marginBottom: 18,
              }}
            >
              FREE PLAN
            </span>

            <h2
              style={{
                margin: 0,
                fontSize: 29,
                color: '#f3eedb',
              }}
            >
              The essentials
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 9,
                marginTop: 16,
                marginBottom: 9,
              }}
            >
              <strong
                style={{
                  fontSize: 49,
                  lineHeight: 1,
                  color: '#f3eedb',
                  fontWeight: 500,
                }}
              >
                Rs 0
              </strong>
              <span style={{ color: '#9f9aa4' }}>/mth</span>
            </div>

            <p
              style={{
                color: '#a9a3ad',
                lineHeight: 1.55,
                marginBottom: 26,
              }}
            >
              A simple starting point for finding the right mood and record.
            </p>

            <div style={{ display: 'grid', gap: 13 }}>
              {freeFeatures.map(({ label, available }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    color: available ? '#e8e1ce' : '#c2bcc5',
                    fontSize: 14,
                  }}
                >
                  {available ? (
                    <Check size={16} color="#f1bc46" />
                  ) : (
                    <LockKeyhole size={16} color="#c2bcc5" />
                  )}
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <button
              className="outline-button"
              type="button"
              disabled
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: 31,
                minHeight: 49,
                opacity: 1,
                color: '#aaa4ae',
              }}
            >
              {isPremium ? 'Previous plan' : 'Current plan'}
            </button>
          </article>
        </div>

        <div
          className="animate-rise-3"
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            color: '#8f8994',
            fontSize: 13,
            flexWrap: 'wrap',
          }}
        >
          <span>
            Premium status belongs to your account and follows you after login.
          </span>
          <Music2 size={17} color="#f1bc46" />
        </div>
      </section>

      {checkoutOpen && !isPremium && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="premium-checkout-title"
          data-testid="premium-checkout-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCheckout();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(5, 6, 12, .78)',
            backdropFilter: 'blur(10px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: 'min(690px, 100%)',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              border: '1px solid rgba(242,236,214,.48)',
              background:
                'linear-gradient(145deg, rgba(31,27,45,.98), rgba(15,16,24,.99))',
              boxShadow: '0 36px 120px rgba(0,0,0,.62)',
              padding: '34px 38px 32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 18,
              }}
            >
              <div>
                <div
                  className="eyebrow"
                  style={{
                    color: '#f1bc46',
                    marginBottom: 10,
                  }}
                >
                  SECURE CHECKOUT / MOCK PAYMENT
                </div>

                <h2
                  id="premium-checkout-title"
                  style={{
                    margin: 0,
                    color: '#f3eedb',
                    fontSize: 'clamp(32px, 5vw, 46px)',
                    fontWeight: 500,
                  }}
                >
                  Open the premium room.
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeCheckout}
                disabled={isBusy}
                aria-label="Close checkout"
                data-testid="button-close-checkout"
                style={{
                  width: 47,
                  height: 47,
                  minWidth: 47,
                  borderRadius: 0,
                }}
              >
                <X size={21} />
              </button>
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,.17)',
                borderBottom: '1px solid rgba(255,255,255,.17)',
                padding: '19px 0',
                margin: '26px 0 23px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20,
                fontSize: 16,
              }}
            >
              <strong style={{ color: '#f3eedb' }}>
                MOOSIC Premium
              </strong>
              <strong style={{ color: '#f1bc46' }}>
                Rs 299 / month
              </strong>
            </div>

            <div style={{ display: 'grid', gap: 17 }}>
              <label
                style={{
                  display: 'grid',
                  gap: 8,
                  color: '#eee7d8',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Cardholder name
                <input
                  value={cardholderName}
                  onChange={(event) => {
                    setCardholderName(event.target.value);
                    setCheckoutMessage('');
                  }}
                  autoComplete="cc-name"
                  placeholder="Your name"
                  data-testid="input-checkout-name"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 15px',
                    minHeight: 52,
                    border: '1px solid rgba(255,255,255,.28)',
                    background: 'rgba(255,255,255,.045)',
                    color: '#f3eedb',
                    outline: 'none',
                    font: 'inherit',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'grid',
                  gap: 8,
                  color: '#eee7d8',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Card number
                <input
                  value={cardNumber}
                  onChange={(event) => {
                    setCardNumber(formatCardNumber(event.target.value));
                    setCheckoutMessage('');
                  }}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  data-testid="input-checkout-card-number"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 15px',
                    minHeight: 52,
                    border: '1px solid rgba(255,255,255,.28)',
                    background: 'rgba(255,255,255,.045)',
                    color: '#f3eedb',
                    outline: 'none',
                    font: 'inherit',
                    letterSpacing: '.04em',
                  }}
                />
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 15,
                }}
              >
                <label
                  style={{
                    display: 'grid',
                    gap: 8,
                    color: '#eee7d8',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Expiry
                  <input
                    value={expiry}
                    onChange={(event) => {
                      setExpiry(formatExpiry(event.target.value));
                      setCheckoutMessage('');
                    }}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    data-testid="input-checkout-expiry"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '14px 15px',
                      minHeight: 52,
                      border: '1px solid rgba(255,255,255,.28)',
                      background: 'rgba(255,255,255,.045)',
                      color: '#f3eedb',
                      outline: 'none',
                      font: 'inherit',
                    }}
                  />
                </label>

                <label
                  style={{
                    display: 'grid',
                    gap: 8,
                    color: '#eee7d8',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  CVV
                  <input
                    value={cvv}
                    onChange={(event) => {
                      setCvv(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 4)
                      );
                      setCheckoutMessage('');
                    }}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    data-testid="input-checkout-cvv"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '14px 15px',
                      minHeight: 52,
                      border: '1px solid rgba(255,255,255,.28)',
                      background: 'rgba(255,255,255,.045)',
                      color: '#f3eedb',
                      outline: 'none',
                      font: 'inherit',
                    }}
                  />
                </label>
              </div>

              {checkoutMessage && (
                <div
                  role="alert"
                  style={{
                    color: '#f2b3aa',
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  {checkoutMessage}
                </div>
              )}

              <button
                type="button"
                className="solid-button"
                onClick={() => void completeMockPayment()}
                disabled={isBusy}
                data-testid="button-complete-mock-payment"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  minHeight: 55,
                  marginTop: 2,
                  background: '#f2ecd6',
                  color: '#17131b',
                }}
              >
                <CreditCard size={16} />
                {isBusy ? 'Processing mock payment…' : 'Complete mock payment'}
              </button>

              <button
                type="button"
                onClick={() => void simulateFailure()}
                disabled={isBusy}
                data-testid="button-simulate-payment-failure"
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#d8c9ce',
                  textDecoration: 'underline',
                  cursor: isBusy ? 'wait' : 'pointer',
                  font: 'inherit',
                  fontSize: 13,
                  justifySelf: 'center',
                }}
              >
                Simulate payment failure
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 9,
                  color: '#aaa4ae',
                  fontSize: 12,
                  lineHeight: 1.45,
                  marginTop: 3,
                }}
              >
                <LockKeyhole
                  size={15}
                  color="#f1bc46"
                  style={{ marginTop: 1, flex: '0 0 auto' }}
                />
                <span>
                  This mock checkout records only the sandbox result in the backend.
                  The card fields are never sent to the server and no real payment is processed.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CustomThemePage({
  selectedColor,
  setSelectedColor,
  setNotice,
  isPremium,
}: {
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  setNotice: (notice: string) => void;
  isPremium: boolean;
}) {
  const applyTheme = (color: string) => {
    if (!isPremium) {
      setNotice('Custom themes are a MOOSIC Premium feature.');
      return;
    }

    setSelectedColor(color);
    window.localStorage.setItem('moodsic-custom-theme', color);

    const theme = themePalette.find(
      (option) => option.color === color
    );

    setNotice(
      `Custom theme changed to ${theme?.name ?? color}.`
    );
  };

  const clearTheme = () => {
    setSelectedColor(null);
    window.localStorage.removeItem('moodsic-custom-theme');
    setNotice('Back to the mood room background.');
  };

  if (!isPremium) {
    return (
      <section className="page custom-theme-page">
        <div className="eyebrow animate-rise">
          Make the room yours / Premium
        </div>

        <div
          className="animate-rise-2"
          style={{
            maxWidth: 720,
            marginTop: 32,
            padding: '46px 42px',
            border: '1px solid rgba(241,188,70,.45)',
            borderRadius: 28,
            background:
              'linear-gradient(145deg, rgba(241,188,70,.07), rgba(255,255,255,.02))',
          }}
        >
          <LockKeyhole size={28} color="#f1bc46" />
          <h1
            className="section-title"
            style={{ marginTop: 20 }}
          >
            Premium <em>room styling.</em>
          </h1>
          <p
            style={{
              color: '#aaa4ae',
              maxWidth: 520,
              lineHeight: 1.6,
            }}
          >
            Unlimited custom themes are part of MOOSIC Premium.
            Your normal mood backgrounds remain available on the free plan.
          </p>

          <Link
            href="/premium"
            className="solid-button"
            style={{
              display: 'inline-flex',
              marginTop: 18,
            }}
          >
            <Crown size={15} />
            Unlock with Premium
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page custom-theme-page">
      <div className="eyebrow animate-rise">
        Make the room yours / 005
      </div>

      <div className="theme-heading animate-rise">
        <div>
          <h1 className="section-title">
            Custom <em>Theme</em>
          </h1>
          <p>
            Choose the background that matches how you feel right now.
            Your choice stays with you when you come back.
          </p>
        </div>

        <div
          className="theme-preview"
          style={{
            background: selectedColor ?? '#090a12',
            color: readableTextColor(
              selectedColor ?? '#090a12'
            ),
          }}
          aria-label={
            selectedColor
              ? `Current custom theme ${selectedColor}`
              : 'Using the current mood background'
          }
        >
          <span>
            {themePalette.find(
              (option) =>
                option.color === selectedColor
            )?.name ?? 'Mood room'}
          </span>
        </div>
      </div>

      <div
        className="theme-palette animate-rise-2"
        aria-label="Custom background colors"
      >
        {themePalette.map(
          ({ name, color }) => (
            <button
              key={color}
              className={`theme-swatch ${
                selectedColor === color
                  ? 'selected'
                  : ''
              }`}
              style={{
                '--swatch': color,
              } as CSSProperties}
              onClick={() => applyTheme(color)}
              aria-label={`Use ${name} as the background`}
              aria-pressed={
                selectedColor === color
              }
              data-testid={`button-theme-${color.slice(1)}`}
            >
              <span className="theme-swatch-dot" />
              <span className="theme-swatch-copy">
                <strong>{name}</strong>
                <small>{color}</small>
              </span>
              {selectedColor === color && (
                <Check size={16} />
              )}
            </button>
          )
        )}
      </div>

      <div className="theme-actions animate-rise-3">
        <button
          className="outline-button small-button"
          onClick={clearTheme}
          disabled={!selectedColor}
          data-testid="button-reset-theme"
        >
          Use mood background
        </button>
        <span className="muted">
          {selectedColor
            ? 'Custom background active across your listening room.'
            : 'Pick a color to replace the default dark background.'}
        </span>
      </div>
    </section>
  );
}

function ProfilePage({
  authUser,
  setNotice,
  onSignOut,
  onSaveProfile,
}: {
  authUser: AuthUser;
  setNotice: (notice: string) => void;
  onSignOut: () => void;
  onSaveProfile: (name: string, profileNote: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(authUser.name);
  const [profileNote, setProfileNote] = useState(authUser.profileNote ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setName(authUser.name);
    setProfileNote(authUser.profileNote ?? '');
  }, [authUser.name, authUser.profileNote]);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      setStatsLoading(true);

      try {
        const payload = await apiRequest(
          `/users/${authUser.id}/listening-stats`
        ) as ListeningStats;

        if (active) {
          setStats(payload);
        }
      } catch (error) {
        console.error('Failed to load listening stats:', error);
        if (active) {
          setNotice(
            error instanceof Error
              ? error.message
              : 'Could not load your listening statistics.'
          );
        }
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      active = false;
    };
  }, [authUser.id]);

  const cancel = () => {
    setName(authUser.name);
    setProfileNote(authUser.profileNote ?? '');
    setEditing(false);
  };

  const save = async () => {
    const cleanedName = name.trim();

    if (!cleanedName) {
      setNotice('Your name cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      const saved = await onSaveProfile(cleanedName, profileNote.trim());
      if (saved) {
        setEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const currentNote = authUser.profileNote?.trim();
  const rotation = stats?.rotation ?? {
    Happy: 0,
    Neutral: 0,
    Sad: 0,
    Exhausted: 0,
    Angry: 0,
  };

  const memberSince = stats?.member_since
    ? new Date(stats.member_since).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <section className="page">
      <div className="eyebrow animate-rise">Your listening log / 006</div>
      <div className="profile-layout" style={{ marginTop: 27 }}>
        <div className="profile-panel animate-rise-2">
          <div className="profile-avatar">{avatarInitial(authUser)}</div>

          {editing ? (
            <div className="edit-form">
              <label htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                data-testid="input-profile-name"
              />

              <label htmlFor="profile-note">Currently into</label>
              <input
                id="profile-note"
                value={profileNote}
                onChange={(event) => setProfileNote(event.target.value)}
                maxLength={180}
                placeholder="Slow records and late walks"
                data-testid="input-profile-note"
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
                <button
                  className="solid-button small-button"
                  onClick={() => void save()}
                  disabled={isSaving}
                  data-testid="button-save-profile"
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  className="outline-button small-button"
                  onClick={cancel}
                  disabled={isSaving}
                  data-testid="button-cancel-profile"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1>{authUser.username}</h1>
              <p>
                {authUser.name}
                {currentNote ? ` · ${currentNote}` : ' · Tell MOOSIC what you’re currently into.'}
              </p>
              <div className="profile-actions">
                <button
                  className="outline-button small-button"
                  onClick={() => setEditing(true)}
                  data-testid="button-edit-profile"
                >
                  <Pencil size={14} /> Edit profile
                </button>
                <button
                  className="sign-out-button"
                  onClick={onSignOut}
                  data-testid="button-sign-out"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>

        <div className="summary-panel animate-rise-3">
          <h2>{stats?.month_label ?? 'This month'}, in records</h2>

          <div className="stat-grid">
            <div className="stat">
              <b>{statsLoading ? '—' : (stats?.hours_listened ?? 0).toFixed(2)}</b>
              <span>hours listened</span>
            </div>
            <div className="stat">
              <b>{statsLoading ? '—' : stats?.records_visited ?? 0}</b>
              <span>records visited</span>
            </div>
            <div className="stat">
              <b>{statsLoading ? '—' : stats?.favorite_tracks ?? 0}</b>
              <span>favorite tracks</span>
            </div>
          </div>

          <div className="taste-list">
            <div className="eyebrow">Your current rotation</div>
            {moods.map((item) => {
              const value = rotation[item.name] ?? 0;

              return (
                <div className="taste-line" key={item.name}>
                  <span>{item.name}</span>
                  <div
                    className="taste-bar"
                    style={{ '--taste': item.color } as CSSProperties}
                  >
                    <span style={{ width: `${value}%` }} />
                  </div>
                  <span>{Math.round(value)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hairline" style={{ marginTop: 28 }} />
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', color: '#8c8893', fontSize: 14 }}>
        <span>
          {memberSince
            ? `Member since ${memberSince}`
            : 'Member since your first needle drop'}
        </span>
        <Music2 size={17} color="#f1bc46" />
      </div>
    </section>
  );
}

function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiRequest('/manager/dashboard')
      .then((payload) => setData(payload as ManagerDashboardData))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load manager dashboard.'));
  }, []);

  if (message) {
    return (
      <section className="page">
        <div className="empty-state">
          <h2>Manager dashboard unavailable.</h2>
          <p>{message}</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="page">
        <div className="empty-state">
          <h2>Loading manager dashboard…</h2>
        </div>
      </section>
    );
  }

  const cards = [
    ['Users', data.kpis.total_users],
    ['Premium users', data.kpis.premium_users],
    ['Songs', data.kpis.total_songs],
    ['Artists', data.kpis.total_artists],
    ['Albums', data.kpis.total_albums],
    ['Successful payments', data.kpis.successful_payments],
    ['Revenue', `€${Number(data.kpis.total_revenue).toFixed(2)}`],
  ];

  return (
    <section className="page">
      <div className="page-heading animate-rise">
        <div>
          <div className="eyebrow">Manager / 001</div>
          <h1>Business<br /><em>dashboard.</em></h1>
        </div>
      </div>
      <p className="muted">Signed in as {data.manager.name} · {data.manager.role}</p>
      <div className="stat-grid animate-rise-2" style={{ marginTop: 24 }}>
        {cards.map(([label, value]) => (
          <div className="stat" key={String(label)}>
            <b>{String(value)}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="hairline" style={{ margin: '30px 0 18px' }} />
      <p className="muted">Use the Manager navigation to manage users, songs, and payment records.</p>
    </section>
  );
}

function ManagerUsersPage() {
  const [users, setUsers] = useState<ManagerUser[]>([]);
  const [message, setMessage] = useState('');

  const load = () =>
    apiRequest('/manager/users')
      .then((payload) => {
        const value = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).users : undefined;
        setUsers(
          Array.isArray(payload)
            ? payload as ManagerUser[]
            : Array.isArray(value)
              ? value as ManagerUser[]
              : [],
        );
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load users.'));

  useEffect(() => {
    void load();
  }, []);

  const togglePremium = async (user: ManagerUser) => {
    try {
      const updated = await apiRequest(`/manager/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_premium: !user.is_premium }),
      }) as ManagerUser;

      setUsers((current) => current.map((item) => item.id === user.id ? updated : item));
      setMessage(`${user.username} is now ${updated.is_premium ? 'Premium' : 'Free'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update user.');
    }
  };

  return (
    <section className="page">
      <div className="eyebrow">Manager / 002</div>
      <h1 className="section-title" style={{ margin: '15px 0 22px' }}>User<br /><em>management.</em></h1>
      {message && <p className="muted">{message}</p>}
      <div className="library-grid">
        {users.map((user) => (
          <article className="library-card" key={user.id}>
            <div className="cover-meta">
              <div>
                <h2>{user.name || user.username}</h2>
                <p>{user.email}</p>
                <p>{user.role} · {user.is_premium ? 'Premium' : 'Free'}</p>
              </div>
              <UserRound size={18} />
            </div>
            <div className="card-actions">
              {user.id > 0 && (
                <button className="solid-button small-button" onClick={() => void togglePremium(user)}>
                  {user.is_premium ? 'Set Free' : 'Grant Premium'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {users.length === 0 && !message && <div className="empty-state"><h2>No users found.</h2></div>}
    </section>
  );
}

function ManagerSongsPage() {
  const [songs, setSongs] = useState<BackendSong[]>([]);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<MoodName>('Neutral');

  const load = () =>
    apiRequest('/songs?limit=200')
      .then((payload) => {
        const value = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).songs : undefined;
        setSongs(
          Array.isArray(payload)
            ? payload as BackendSong[]
            : Array.isArray(value)
              ? value as BackendSong[]
              : [],
        );
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load songs.'));

  useEffect(() => {
    void load();
  }, []);

  const beginEdit = (song: BackendSong) => {
    if (typeof song.id !== 'number') return;
    setEditingId(song.id);
    setTitle(song.title);
    setMood((moods.some((item) => item.name === song.mood) ? song.mood : 'Neutral') as MoodName);
    setMessage('');
  };

  const saveEdit = async (song: BackendSong) => {
    if (typeof song.id !== 'number') return;

    try {
      const updated = await apiRequest(`/manager/songs/${song.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim() || song.title,
          mood,
        }),
      }) as BackendSong;

      setSongs((current) => current.map((item) => item.id === song.id ? { ...item, ...updated } : item));
      setEditingId(null);
      setMessage(`Updated ${updated.title ?? song.title}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update song.');
    }
  };

  const removeSong = async (song: BackendSong) => {
    if (typeof song.id !== 'number') return;
    if (!window.confirm(`Delete "${song.title}"?`)) return;

    try {
      await apiRequest(`/manager/songs/${song.id}`, { method: 'DELETE' });
      setSongs((current) => current.filter((item) => item.id !== song.id));
      setMessage(`${song.title} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete song.');
    }
  };

  return (
    <section className="page">
      <div className="eyebrow">Manager / 003</div>
      <h1 className="section-title" style={{ margin: '15px 0 22px' }}>Song<br /><em>management.</em></h1>
      {message && <p className="muted">{message}</p>}
      <div className="result-section">
        {songs.map((song) => (
          <div className="result-row" key={song.id ?? song.title}>
            {editingId === song.id ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                <input
                  className="builder-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  style={{ flex: 1, minWidth: 220 }}
                />
                <select
                  className="builder-input"
                  value={mood}
                  onChange={(event) => setMood(event.target.value as MoodName)}
                >
                  {moods.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
                <button className="solid-button small-button" onClick={() => void saveEdit(song)}>Save</button>
                <button className="outline-button small-button" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="result-row-main">
                  <strong>{song.title}</strong>
                  <small>{song.artist_name ?? 'Unknown artist'} / {song.mood ?? 'Neutral'}</small>
                </div>
                <div className="result-row-actions">
                  <button className="icon-button" onClick={() => beginEdit(song)} aria-label={`Edit ${song.title}`}>
                    <Pencil size={14} />
                  </button>
                  <button className="icon-button" onClick={() => void removeSong(song)} aria-label={`Delete ${song.title}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ManagerPaymentsPage() {
  const [payments, setPayments] = useState<ManagerPayment[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiRequest('/manager/payments')
      .then((payload) => {
        const value = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).payments : undefined;
        setPayments(
          Array.isArray(payload)
            ? payload as ManagerPayment[]
            : Array.isArray(value)
              ? value as ManagerPayment[]
              : [],
        );
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load payments.'));
  }, []);

  return (
    <section className="page">
      <div className="eyebrow">Manager / 004</div>
      <h1 className="section-title" style={{ margin: '15px 0 22px' }}>Payment<br /><em>records.</em></h1>
      {message && <p className="muted">{message}</p>}
      <div className="result-section">
        {payments.map((payment) => (
          <div className="result-row" key={payment.id}>
            <div className="result-row-main">
              <strong>{payment.plan}</strong>
              <small>User #{payment.user_id} / {payment.status} / {new Date(payment.payment_date).toLocaleString()}</small>
            </div>
            <strong>{payment.currency} {Number(payment.amount).toFixed(2)}</strong>
          </div>
        ))}
      </div>
      {payments.length === 0 && !message && <div className="empty-state"><h2>No payment records.</h2></div>}
    </section>
  );
}

function ManagerPage({ onSignOut }: { onSignOut: () => void }) {
  const [dashboard, setDashboard] = useState<ManagerDashboardData | null>(null);
  const [users, setUsers] = useState<ManagerUser[]>([]);
  const [songs, setSongs] = useState<BackendSong[]>([]);
  const [payments, setPayments] = useState<ManagerPayment[]>([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'songs' | 'payments'>('overview');
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingMood, setEditingMood] = useState<MoodName>('Neutral');

  const loadManagerData = async () => {
    setMessage('');
    try {
      const [dashboardPayload, usersPayload, songsPayload, paymentsPayload] = await Promise.all([
        apiRequest('/manager/dashboard'),
        apiRequest('/manager/users'),
        apiRequest('/songs?limit=200'),
        apiRequest('/manager/payments'),
      ]);

      const usersValue = usersPayload && typeof usersPayload === 'object'
        ? (usersPayload as Record<string, unknown>).users
        : undefined;
      const songsValue = songsPayload && typeof songsPayload === 'object'
        ? (songsPayload as Record<string, unknown>).songs
        : undefined;
      const paymentsValue = paymentsPayload && typeof paymentsPayload === 'object'
        ? (paymentsPayload as Record<string, unknown>).payments
        : undefined;

      setDashboard(dashboardPayload as ManagerDashboardData);
      setUsers(
        Array.isArray(usersPayload)
          ? usersPayload as ManagerUser[]
          : Array.isArray(usersValue)
            ? usersValue as ManagerUser[]
            : [],
      );
      setSongs(
        Array.isArray(songsPayload)
          ? songsPayload as BackendSong[]
          : Array.isArray(songsValue)
            ? songsValue as BackendSong[]
            : [],
      );
      setPayments(
        Array.isArray(paymentsPayload)
          ? paymentsPayload as ManagerPayment[]
          : Array.isArray(paymentsValue)
            ? paymentsValue as ManagerPayment[]
            : [],
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load manager dashboard.');
    }
  };

  useEffect(() => {
    void loadManagerData();
  }, []);

  const togglePremium = async (user: ManagerUser) => {
    try {
      const updated = await apiRequest(`/manager/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_premium: !user.is_premium }),
      }) as ManagerUser;
      setUsers((current) => current.map((item) => item.id === user.id ? updated : item));
      setMessage(`${user.username} is now ${updated.is_premium ? 'Premium' : 'Free'}.`);
      const refreshed = await apiRequest('/manager/dashboard') as ManagerDashboardData;
      setDashboard(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update user.');
    }
  };

  const beginEditSong = (song: BackendSong) => {
    if (typeof song.id !== 'number') return;
    setEditingSongId(song.id);
    setEditingTitle(song.title);
    setEditingMood((moods.some((item) => item.name === song.mood) ? song.mood : 'Neutral') as MoodName);
    setMessage('');
  };

  const saveSong = async (song: BackendSong) => {
    if (typeof song.id !== 'number') return;
    try {
      const updated = await apiRequest(`/manager/songs/${song.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingTitle.trim() || song.title,
          mood: editingMood,
        }),
      }) as BackendSong;
      setSongs((current) => current.map((item) => item.id === song.id ? { ...item, ...updated } : item));
      setEditingSongId(null);
      setMessage(`Updated ${updated.title ?? song.title}.`);
      const refreshed = await apiRequest('/manager/dashboard') as ManagerDashboardData;
      setDashboard(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update song.');
    }
  };

  const removeSong = async (song: BackendSong) => {
    if (typeof song.id !== 'number') return;
    if (!window.confirm(`Delete "${song.title}"?`)) return;
    try {
      await apiRequest(`/manager/songs/${song.id}`, { method: 'DELETE' });
      setSongs((current) => current.filter((item) => item.id !== song.id));
      setMessage(`${song.title} deleted.`);
      const refreshed = await apiRequest('/manager/dashboard') as ManagerDashboardData;
      setDashboard(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete song.');
    }
  };

  if (!dashboard) {
    return (
      <section className="page manager-dashboard-page">
        <div className="eyebrow">MOOSIC / MANAGER</div>
        <h1 className="display-title">Manager<br /><em>dashboard.</em></h1>
        {message ? <p className="muted">{message}</p> : <p className="muted">Loading business data…</p>}
        <button className="outline-button small-button" onClick={onSignOut}>Sign out</button>
      </section>
    );
  }

  const cards = [
    ['Users', dashboard.kpis.total_users],
    ['Premium users', dashboard.kpis.premium_users],
    ['Songs', dashboard.kpis.total_songs],
    ['Artists', dashboard.kpis.total_artists],
    ['Albums', dashboard.kpis.total_albums],
    ['Successful payments', dashboard.kpis.successful_payments],
    ['Revenue', `€${Number(dashboard.kpis.total_revenue).toFixed(2)}`],
  ];

  const tabButtonStyle = (active: boolean) => ({
    border: `1px solid ${active ? '#f1bc46' : 'rgba(247,239,205,.22)'}`,
    background: active ? 'rgba(241,188,70,.12)' : 'transparent',
    color: active ? '#f1bc46' : 'var(--app-foreground, #f7efcd)',
    padding: '10px 15px',
    cursor: 'pointer',
    fontSize: 12,
    letterSpacing: '.08em',
    textTransform: 'uppercase' as const,
  });

  return (
    <section className="page manager-dashboard-page">
      <div className="page-heading animate-rise">
        <div>
          <div className="eyebrow">MOOSIC / MANAGER</div>
          <h1>Business<br /><em>dashboard.</em></h1>
          <p className="muted">Signed in as {dashboard.manager.name} · manager</p>
        </div>
        <button className="outline-button small-button" onClick={onSignOut}>Sign out</button>
      </div>

      {message && <p className="muted" role="status">{message}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '24px 0 28px' }}>
        {([
          ['overview', 'Overview'],
          ['users', 'Users'],
          ['songs', 'Songs'],
          ['payments', 'Payments'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={tabButtonStyle(activeTab === tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="stat-grid animate-rise-2">
            {cards.map(([label, value]) => (
              <div className="stat" key={String(label)}>
                <b>{String(value)}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="hairline" style={{ margin: '34px 0 24px' }} />
          <p className="muted">Use the tabs above to manage users, songs, and payment records.</p>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="eyebrow">Business records / 001</div>
          <h2 className="section-title" style={{ margin: '12px 0 18px' }}>User<br /><em>management.</em></h2>
          <div className="library-grid">
            {users.map((user) => (
              <article className="library-card" key={user.id}>
                <div className="cover-meta">
                  <div>
                    <h2>{user.name || user.username}</h2>
                    <p>{user.email}</p>
                    <p>{user.role} · {user.is_premium ? 'Premium' : 'Free'}</p>
                  </div>
                  <UserRound size={18} />
                </div>
                <div className="card-actions">
                  {user.role !== 'manager' && (
                    <button className="solid-button small-button" onClick={() => void togglePremium(user)}>
                      {user.is_premium ? 'Set Free' : 'Grant Premium'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {users.length === 0 && <div className="empty-state"><h2>No users found.</h2></div>}
        </div>
      )}

      {activeTab === 'songs' && (
        <div>
          <div className="eyebrow">Business records / 002</div>
          <h2 className="section-title" style={{ margin: '12px 0 18px' }}>Song<br /><em>management.</em></h2>
          <div className="result-section">
            {songs.map((song) => (
              <div className="result-row" key={song.id ?? song.title}>
                {editingSongId === song.id ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                    <input
                      className="builder-input"
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      style={{ flex: 1, minWidth: 220 }}
                    />
                    <select
                      className="builder-input"
                      value={editingMood}
                      onChange={(event) => setEditingMood(event.target.value as MoodName)}
                    >
                      {moods.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                    </select>
                    <button className="solid-button small-button" onClick={() => void saveSong(song)}>Save</button>
                    <button className="outline-button small-button" onClick={() => setEditingSongId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="result-row-main">
                      <strong>{song.title}</strong>
                      <small>{song.artist_name ?? 'Unknown artist'} / {song.mood ?? 'Neutral'}</small>
                    </div>
                    <div className="result-row-actions">
                      <button className="icon-button" onClick={() => beginEditSong(song)} aria-label={`Edit ${song.title}`}>
                        <Pencil size={14} />
                      </button>
                      <button className="icon-button" onClick={() => void removeSong(song)} aria-label={`Delete ${song.title}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {songs.length === 0 && <div className="empty-state"><h2>No songs found.</h2></div>}
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          <div className="eyebrow">Business records / 003</div>
          <h2 className="section-title" style={{ margin: '12px 0 18px' }}>Payment<br /><em>records.</em></h2>
          <div className="result-section">
            {payments.map((payment) => (
              <div className="result-row" key={payment.id}>
                <div className="result-row-main">
                  <strong>{payment.plan}</strong>
                  <small>User #{payment.user_id} / {payment.status} / {new Date(payment.payment_date).toLocaleString()}</small>
                </div>
                <strong>{payment.currency} {Number(payment.amount).toFixed(2)}</strong>
              </div>
            ))}
          </div>
          {payments.length === 0 && <div className="empty-state"><h2>No payment records.</h2></div>}
        </div>
      )}
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
  const [browsingMood, setBrowsingMood] = useState<MoodName>('Neutral');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [catalog, setCatalog] = useState<Track[]>(fallbackTracks);
  const [library, setLibrary] = useState<Playlist[]>(fallbackPlaylists);
  const [deletedPlaylists, setDeletedPlaylists] = useState<Playlist[]>([]);
  const [notice, setNotice] = useState('');
  const [customTheme, setCustomTheme] = useState<string | null>(
    () => window.localStorage.getItem('moodsic-custom-theme')
  );
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [premiumBusy, setPremiumBusy] = useState(false);
  const [downloads, setDownloads] = useState<BackendDownload[]>([]);

  const numericUserId =
    authUser ? Number(authUser.id) : NaN;

  const refreshPremiumStatus = async () => {
    if (!authUser) {
      setPremiumStatus(null);
      return;
    }

    try {
      const payload = await apiRequest(
        '/premium/status'
      ) as PremiumStatus;

      setPremiumStatus(payload);

      if (!payload.is_premium) {
        setCustomTheme(null);
        window.localStorage.removeItem(
          'moodsic-custom-theme'
        );
      }
    } catch (error) {
      console.error(
        'Failed to load premium status:',
        error
      );
      setPremiumStatus({
        is_premium: false,
        plan: null,
        status: 'free',
      });
    }
  };

  useEffect(() => {
    void refreshPremiumStatus();
  }, [authUser?.id]);

  const upgradePremium = async (
    paymentMethod: 'test_success' | 'test_failure'
  ): Promise<boolean> => {
    if (premiumBusy) return false;

    setPremiumBusy(true);

    try {
      const payload = await apiRequest(
        '/premium/subscribe',
        {
          method: 'POST',
          body: JSON.stringify({
            plan: 'premium',
            payment_method: paymentMethod,
          }),
        }
      ) as PremiumStatus & {
        message?: string;
        payment_status?: string;
      };

      const activated =
        Boolean(payload.is_premium) &&
        payload.payment_status !== 'failed';

      setPremiumStatus({
        is_premium: activated,
        plan: activated
          ? (payload.plan ?? 'premium')
          : null,
        status: activated
          ? (payload.status ?? 'active')
          : 'free',
      });

      if (activated) {
        setNotice(
          'Mock payment completed. MOOSIC Premium is now active.'
        );
      } else {
        setNotice(
          payload.message ??
          'Mock payment failed. Your account remains on the free plan.'
        );
      }

      return activated;
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not process the mock payment.'
      );
      return false;
    } finally {
      setPremiumBusy(false);
    }
  };

  const cancelPremium = async () => {
    if (premiumBusy) return;

    setPremiumBusy(true);

    try {
      await apiRequest(
        '/premium/cancel',
        { method: 'POST' }
      );

      setPremiumStatus({
        is_premium: false,
        plan: null,
        status: 'free',
      });

      setCustomTheme(null);
      window.localStorage.removeItem(
        'moodsic-custom-theme'
      );
      setDownloads([]);

      setNotice(
        'Premium cancelled. Your account is back on the free plan.'
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not cancel premium.'
      );
    } finally {
      setPremiumBusy(false);
    }
  };

  const refreshDownloads = async () => {
    if (
      !premiumStatus?.is_premium ||
      !Number.isFinite(numericUserId)
    ) {
      setDownloads([]);
      return;
    }

    try {
      const payload = await apiRequest(
        `/users/${numericUserId}/downloads`
      );

      setDownloads(
        Array.isArray(payload)
          ? payload as BackendDownload[]
          : []
      );
    } catch (error) {
      console.error(
        'Failed to load downloads:',
        error
      );

      setDownloads([]);
    }
  };

  useEffect(() => {
    if (premiumStatus?.is_premium) {
      void refreshDownloads();
    } else {
      setDownloads([]);
    }
  }, [
    premiumStatus?.is_premium,
    authUser?.id,
  ]);

  const downloadTrack = async (
    track: Track
  ) => {
    if (!premiumStatus?.is_premium) {
      setNotice(
        'Unlock with Premium to save tracks to your downloads library.'
      );
      setLocation('/premium');
      return;
    }

    if (
      !track.id ||
      !Number.isFinite(numericUserId)
    ) {
      setNotice(
        'This track cannot be saved to downloads.'
      );
      return;
    }

    if (
      downloads.some(
        (download) =>
          download.song_id === track.id
      )
    ) {
      setNotice(
        `${track.title} is already in your downloads library.`
      );
      return;
    }

    try {
      await apiRequest(
        `/users/${numericUserId}/downloads`,
        {
          method: 'POST',
          body: JSON.stringify({
            song_id: track.id,
          }),
        }
      );

      await refreshDownloads();

      setNotice(
        `${track.title} saved to your Premium downloads library.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not save this track.'
      );
    }
  };

  const removeDownload = async (
    songId: number
  ) => {
    if (
      !premiumStatus?.is_premium ||
      !Number.isFinite(numericUserId)
    ) {
      setNotice(
        'Unlock with Premium to manage downloads.'
      );
      return;
    }

    try {
      await apiRequest(
        `/users/${numericUserId}/downloads/${songId}`,
        {
          method: 'DELETE',
        }
      );

      await refreshDownloads();

      setNotice(
        'Track removed from your downloads library.'
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not remove this download.'
      );
    }
  };

  const refreshPlaylistState = async (
    activeCatalog: Track[] = catalog
  ) => {
    if (!Number.isFinite(numericUserId)) {
      return;
    }

    const [
      savedPlaylists,
      recycledPlaylists,
    ] = await Promise.all([
      fetchUserPlaylists(
        numericUserId,
        activeCatalog,
        false
      ),
      fetchUserPlaylists(
        numericUserId,
        activeCatalog,
        true
      ),
    ]);

    setLibrary([
      ...savedPlaylists,
      ...buildDefaultPlaylists(activeCatalog),
    ]);

    setDeletedPlaylists(recycledPlaylists);
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/songs?limit=200`
        );

        if (!response.ok) {
          throw new Error(
            `Backend returned ${response.status}`
          );
        }

        const songs: BackendSong[] =
          await response.json();

        const backendTracks = songs
          .filter((song) =>
            Boolean(
              song.title &&
              song.audio_url &&
              song.is_playable !== false
            )
          )
          .map(backendSongToTrack);

        if (
          !active ||
          backendTracks.length === 0
        ) {
          return;
        }

        setCatalog(backendTracks);

        if (Number.isFinite(numericUserId)) {
          const [
            savedPlaylists,
            recycledPlaylists,
          ] = await Promise.all([
            fetchUserPlaylists(
              numericUserId,
              backendTracks,
              false
            ),
            fetchUserPlaylists(
              numericUserId,
              backendTracks,
              true
            ),
          ]);

          if (!active) {
            return;
          }

          setLibrary([
            ...savedPlaylists,
            ...buildDefaultPlaylists(
              backendTracks
            ),
          ]);

          setDeletedPlaylists(
            recycledPlaylists
          );
        } else {
          setLibrary(
            buildDefaultPlaylists(
              backendTracks
            )
          );
          setDeletedPlaylists([]);
        }
      } catch (error) {
        console.error(
          'Failed to load MOOSIC data:',
          error
        );

        if (active) {
          setNotice(
            error instanceof Error
              ? error.message
              : 'MOOSIC could not load your saved data.'
          );
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [authUser?.id]);

  const selectMood = (mood: MoodName) => {
    // Browsing a mood must not interrupt the song that is already playing.
    // The active player changes only after the user actually opens a playlist
    // or explicitly chooses another song.
    setBrowsingMood(mood);
    setLocation('/choose-playlist');
  };

  const openPlaylist = (playlist: Playlist) => {
    setSelectedMood(playlist.mood);
    setSelectedPlaylist(playlist);
    setLocation('/home');
  };

  const playTrack = (track: Track) => {
    setSelectedMood(track.mood);
    setSelectedPlaylist({
      id: `single-${track.id ?? track.title}-${Date.now()}`,
      name: track.title,
      mood: track.mood,
      count: 1,
      description: `Now playing ${track.artist}.`,
      trackTitles: [track.title],
    });
    setLocation('/home');
  };

  const signOut = () => {
    clearAuthSession();
    setAuthUser(null);
    setAuthMode('login');
    setSelectedPlaylist(null);
    setBrowsingMood('Neutral');
    setDeletedPlaylists([]);
    setLibrary(
      buildDefaultPlaylists(catalog)
    );
    setLocation('/');
  };

  const createPlaylist = async (
    playlist: Playlist
  ) => {
    if (!Number.isFinite(numericUserId)) {
      setNotice(
        'Please sign in again before creating a playlist.'
      );
      return;
    }

    try {
      const createdPayload = await apiRequest(
        `/users/${numericUserId}/playlists`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: playlist.name,
            description:
              encodePlaylistDescription(
                playlist.description,
                playlist.mood
              ),
            cover_url: null,
          }),
        }
      );

      let playlistId =
        backendPlaylistId(createdPayload);

      if (!playlistId) {
        const activePayload = await apiRequest(
          `/users/${numericUserId}/playlists`
        );

        const rawPlaylists = unwrapArray(
          activePayload,
          ['playlists', 'items', 'results', 'data']
        );

        const matching = [...rawPlaylists]
          .reverse()
          .find((raw) => {
            if (!raw || typeof raw !== 'object') {
              return false;
            }

            const record =
              raw as Record<string, unknown>;

            return (
              record.name === playlist.name ||
              (
                record.playlist &&
                typeof record.playlist === 'object' &&
                (
                  record.playlist as Record<string, unknown>
                ).name === playlist.name
              )
            );
          });

        playlistId =
          backendPlaylistId(matching);
      }

      if (!playlistId) {
        throw new Error(
          'The playlist was created, but MOOSIC could not determine its ID.'
        );
      }

      for (const title of playlist.trackTitles) {
        const track = catalog.find(
          (candidate) =>
            candidate.title === title
        );

        if (!track?.id) {
          continue;
        }

        await apiRequest(
          `/playlists/${playlistId}/songs`,
          {
            method: 'POST',
            body: JSON.stringify({
              song_id: track.id,
              user_id: numericUserId,
            }),
          }
        );
      }

      await refreshPlaylistState();

      setNotice(
        `${playlist.name} is now saved to your account.`
      );
    } catch (error) {
      console.error(
        'Failed to create playlist:',
        error
      );

      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not create the playlist.'
      );
    }
  };

  const deletePlaylist = async (
    playlist: Playlist
  ) => {
    if (!playlist.backendId) {
      setNotice(
        'Built-in mood playlists stay in MOOSIC.'
      );
      return;
    }

    try {
      await apiRequest(
        `/playlists/${playlist.backendId}`,
        {
          method: 'DELETE',
        }
      );

      if (
        selectedPlaylist?.backendId ===
        playlist.backendId
      ) {
        setSelectedPlaylist(null);
      }

      await refreshPlaylistState();

      setNotice(
        `${playlist.name} moved to Restore.`
      );
    } catch (error) {
      console.error(
        'Failed to delete playlist:',
        error
      );

      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not delete the playlist.'
      );
    }
  };

  const restorePlaylist = async (
    playlist: Playlist
  ) => {
    if (!playlist.backendId) {
      return;
    }

    try {
      await apiRequest(
        `/playlists/${playlist.backendId}/restore`,
        {
          method: 'POST',
        }
      );

      await refreshPlaylistState();

      setNotice(
        `${playlist.name} is back on your shelf.`
      );
    } catch (error) {
      console.error(
        'Failed to restore playlist:',
        error
      );

      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not restore the playlist.'
      );
    }
  };

  const restoreAllPlaylists = async () => {
    const restorable =
      deletedPlaylists.filter(
        (playlist) => playlist.backendId
      );

    try {
      for (const playlist of restorable) {
        await apiRequest(
          `/playlists/${playlist.backendId}/restore`,
          {
            method: 'POST',
          }
        );
      }

      await refreshPlaylistState();

      setNotice(
        'Every saved record is back on your shelf.'
      );
    } catch (error) {
      console.error(
        'Failed to restore all playlists:',
        error
      );

      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not restore all playlists.'
      );
    }
  };

  const addTrackToPlaylist = async (
    playlistId: string,
    track: Track
  ) => {
    const playlist = library.find(
      (candidate) =>
        candidate.id === playlistId
    );

    if (
      !playlist?.backendId ||
      !track.id ||
      !Number.isFinite(numericUserId)
    ) {
      setNotice(
        'Create a saved playlist before adding songs.'
      );
      return;
    }

    if (
      playlist.trackTitles.includes(
        track.title
      )
    ) {
      setNotice(
        `${track.title} is already in ${playlist.name}.`
      );
      return;
    }

    try {
      await apiRequest(
        `/playlists/${playlist.backendId}/songs`,
        {
          method: 'POST',
          body: JSON.stringify({
            song_id: track.id,
            user_id: numericUserId,
          }),
        }
      );

      await refreshPlaylistState();

      setNotice(
        `${track.title} added to ${playlist.name}.`
      );
    } catch (error) {
      console.error(
        'Failed to add song to playlist:',
        error
      );

      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not add the song.'
      );
    }
  };

  const downloadedSongIds = new Set(
    downloads.map(
      (download) => download.song_id
    )
  );

  const updateProfile = async (
    name: string,
    profileNote: string
  ): Promise<boolean> => {
    try {
      const payload = await apiRequest('/me', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          profile_note: profileNote,
        }),
      }) as { user?: unknown };

      const updatedUser = normalizeBackendUser(
        payload.user ?? payload
      );

      const session = getAuthenticatedSession();
      storeAuthSession({
        user: updatedUser,
        token: session.token,
      });

      setAuthUser(updatedUser);
      setNotice('Your profile has been updated.');
      return true;
    } catch (error) {
      console.error('Failed to update profile:', error);
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not update your profile.'
      );
      return false;
    }
  };


  return (
    <AuthGate
      authUser={authUser}
      setAuthUser={setAuthUser}
      authMode={authMode}
      setAuthMode={setAuthMode}
    >
      {authUser?.role === 'manager' ? (
        <ManagerPage onSignOut={signOut} />
      ) : (
      <Shell
        authUser={authUser as AuthUser}
        isPremium={Boolean(premiumStatus?.is_premium)}
        appBackground={
          customTheme ??
          (
            location === '/home'
              ? moodFor(selectedMood).background
              : undefined
          )
        }
      >
        {notice && (
          <div className="notice notice-in" role="status" data-testid="status-notice">
            <span>{notice}</span>
            <button
              onClick={() => setNotice('')}
              aria-label="Dismiss feedback"
              data-testid="button-dismiss-notice"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <ErrorBoundary resetKey={location}>
          {/*
            Global persistent player:
            - never unmounts while the user is signed in
            - shows the full player on /home
            - shows a compact mini-player everywhere else
            - browsing/opening another playlist does not replace playback
          */}
          <HomePage
            selectedMood={selectedMood}
            selectedPlaylist={selectedPlaylist}
            setNotice={setNotice}
            tracks={catalog}
            userId={numericUserId}
            compact={location !== '/home'}
            isPremium={Boolean(premiumStatus?.is_premium)}
            downloadedSongIds={downloadedSongIds}
            onDownload={downloadTrack}
          />

          <Switch>
            <Route path="/">
              <MoodPicker
                selectMood={selectMood}
              />
            </Route>

            <Route path="/choose-playlist">
              <PlaylistChoicePage
                moodName={browsingMood}
                library={library}
                choosePlaylist={openPlaylist}
              />
            </Route>

            <Route path="/home">
              <></>
            </Route>

            <Route path="/playlists">
              <PlaylistsPage
                library={library}
                tracks={catalog}
                openPlaylist={openPlaylist}
                setNotice={setNotice}
                onCreate={createPlaylist}
                onDelete={deletePlaylist}
                isPremium={Boolean(premiumStatus?.is_premium)}
              />
            </Route>

            <Route path="/restore">
              <RestorePage
                deletedPlaylists={deletedPlaylists}
                setNotice={setNotice}
                onRestore={restorePlaylist}
                onRestoreAll={restoreAllPlaylists}
              />
            </Route>

            <Route path="/search">
              <SearchPage
                library={library}
                tracks={catalog}
                playTrack={playTrack}
                openPlaylist={openPlaylist}
                setNotice={setNotice}
                addTrackToPlaylist={addTrackToPlaylist}
                isPremium={Boolean(premiumStatus?.is_premium)}
                downloadedSongIds={downloadedSongIds}
                onDownload={downloadTrack}
              />
            </Route>

            <Route path="/downloads">
              <DownloadsPage
                isPremium={Boolean(premiumStatus?.is_premium)}
                downloads={downloads}
                tracks={catalog}
                playTrack={playTrack}
                onRemove={removeDownload}
              />
            </Route>

            <Route path="/theme">
              <CustomThemePage
                selectedColor={customTheme}
                setSelectedColor={setCustomTheme}
                setNotice={setNotice}
                isPremium={Boolean(premiumStatus?.is_premium)}
              />
            </Route>

            <Route path="/premium">
              <PremiumPage
                premiumStatus={premiumStatus}
                onUpgrade={upgradePremium}
                onCancel={cancelPremium}
                isBusy={premiumBusy}
              />
            </Route>

            <Route path="/profile">
              <ProfilePage
                authUser={authUser as AuthUser}
                setNotice={setNotice}
                onSignOut={signOut}
                onSaveProfile={updateProfile}
              />
            </Route>


            {authUser?.role === 'manager' && (
              <Route path="/manager">
                <ManagerPage onSignOut={signOut} />
              </Route>
            )}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </ErrorBoundary>
      </Shell>
      )}
    </AuthGate>
  );
}

function NotFound() {
  return <section className="page"><div className="eyebrow">404 / wrong side</div><h1 className="display-title">This record<br /><em>isn’t here.</em></h1><Link href="/" className="solid-button" data-testid="link-not-found-home">Back to the feeling picker</Link></section>;
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readAuthSession()?.user ?? null);
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
