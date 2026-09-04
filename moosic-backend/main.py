from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Moosic API",
    description="Backend for the Moosic music streaming app",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to Moosic 🎵",
        "status": "Backend is running!"
    }


@app.post("/users")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):

    new_user = models.User(
        username=user.username,
        email=user.email,
        password=user.password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully!",
        "user_id": new_user.id,
        "username": new_user.username,
        "email": new_user.email
    }
@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()

    return users
@app.post("/artists")
def create_artist(
    artist: schemas.ArtistCreate,
    db: Session = Depends(get_db)
):
    new_artist = models.Artist(
        name=artist.name,
        image_url=artist.image_url
    )

    db.add(new_artist)
    db.commit()
    db.refresh(new_artist)

    return {
        "message": "Artist created successfully!",
        "artist_id": new_artist.id,
        "name": new_artist.name
    }
@app.get("/artists")
def get_artists(db: Session = Depends(get_db)):
    artists = db.query(models.Artist).all()

    return artists
@app.post("/songs")
def create_song(
    song: schemas.SongCreate,
    db: Session = Depends(get_db)
):
    new_song = models.Song(
        title=song.title,
        artist_id=song.artist_id,
        genre=song.genre,
        duration=song.duration,
        audio_url=song.audio_url,
        cover_url=song.cover_url
    )

    db.add(new_song)
    db.commit()
    db.refresh(new_song)

    return {
        "message": "Song created successfully!",
        "song_id": new_song.id,
        "title": new_song.title,
        "artist_id": new_song.artist_id
    }
@app.get("/songs")
def get_songs(db: Session = Depends(get_db)):
    songs = db.query(models.Song).all()

    return songs
@app.post("/albums")
def create_album(
    album: schemas.AlbumCreate,
    db: Session = Depends(get_db)
):
    new_album = models.Album(
        title=album.title,
        artist_id=album.artist_id,
        release_date=album.release_date,
        cover_url=album.cover_url
    )

    db.add(new_album)
    db.commit()
    db.refresh(new_album)

    return {
        "message": "Album created successfully!",
        "album_id": new_album.id,
        "title": new_album.title,
        "artist_id": new_album.artist_id
    }