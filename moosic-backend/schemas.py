from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
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
    language: str = "English"
    duration: int | None = None
    audio_url: str | None = None
    cover_url: str | None = None


class PlaylistCreate(BaseModel):
    name: str
    cover_url: str | None = None


class PlaylistSongAdd(BaseModel):
    song_id: int
    user_id: int | None = None


class LikeSongCreate(BaseModel):
    song_id: int


class ListeningHistoryCreate(BaseModel):
    song_id: int


class AudioUrlUpdate(BaseModel):
    song_id: int
    audio_url: str


class BulkAudioUrlUpdate(BaseModel):
    updates: list[AudioUrlUpdate]