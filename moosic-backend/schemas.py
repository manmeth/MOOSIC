from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
class ArtistCreate(BaseModel):
    name: str
    image_url: str | None = None
class SongCreate(BaseModel):
    title: str
    artist_id: int
    genre: str | None = None
    duration: int | None = None
    audio_url: str | None = None
    cover_url: str | None = None
class AlbumCreate(BaseModel):
    title: str
    artist_id: int
    release_date: str | None = None
    cover_url: str | None = None