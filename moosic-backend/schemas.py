from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str = Field(min_length=8)


class ManagerRegistration(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str = Field(min_length=8)
    registration_code: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ArtistCreate(BaseModel):
    name: str
    image_url: str | None = None


class AlbumCreate(BaseModel):
    title: str
    artist_id: int
    release_date: str | None = None
    cover_url: str | None = None


class SongCreate(BaseModel):
    title: str
    artist_id: int
    album_id: int | None = None
    genre: str | None = None
    mood: str | None = None
    language: str = "English"
    duration: int | None = None
    audio_url: str | None = None
    cover_url: str | None = None


class PlaylistCreate(BaseModel):
    name: str
    cover_url: str | None = None
    description: str | None = None


class PlaylistUpdate(BaseModel):
    name: str | None = None
    cover_url: str | None = None
    description: str | None = None


class PlaylistSongAdd(BaseModel):
    song_id: int
    user_id: int | None = None


class PlaylistSongReorder(BaseModel):
    song_ids: list[int]


class QueueSongAdd(BaseModel):
    song_id: int


class PlaybackStateUpdate(BaseModel):
    song_id: int | None = None
    position_seconds: int = 0
    is_playing: bool = False


class LikeSongCreate(BaseModel):
    song_id: int


class ListeningHistoryCreate(BaseModel):
    song_id: int
    progress_seconds: int = 0
    completed: bool = False
    skipped: bool = False


class AudioUrlUpdate(BaseModel):
    song_id: int
    audio_url: str


class BulkAudioUrlUpdate(BaseModel):
    updates: list[AudioUrlUpdate]


class PremiumSubscribeRequest(BaseModel):
    plan: str
    payment_method: str


class PremiumStatusResponse(BaseModel):
    is_premium: bool
    plan: str | None
    status: str | None


class PremiumCancelResponse(BaseModel):
    message: str
    is_premium: bool
