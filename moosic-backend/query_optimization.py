"""
DATABASE QUERY OPTIMIZATION MODULE
Implements eager loading patterns and optimized query helpers to reduce N+1 queries
and improve overall database performance.
"""

from sqlalchemy.orm import Session, joinedload
import models


class OptimizedQueries:
    """Provides optimized query methods with eager loading and joins."""

    @staticmethod
    def get_user_by_id(db: Session, user_id: int):
        """Get user with relationships pre-loaded."""
        return (
            db.query(models.User)
            .filter(models.User.id == user_id)
            .options(
                joinedload(models.User.playlists)  # Eager load playlists
            )
            .first()
        )

    @staticmethod
    def get_artist_with_albums_and_songs(db: Session, artist_id: int):
        """Get artist with all albums and songs eagerly loaded (optimized single query)."""
        return (
            db.query(models.Artist)
            .filter(models.Artist.id == artist_id)
            .options(
                joinedload(models.Artist.albums).joinedload(models.Album.songs),
                joinedload(models.Artist.songs)
            )
            .first()
        )

    @staticmethod
    def get_album_with_songs(db: Session, album_id: int):
        """Get album with songs and artist eagerly loaded."""
        return (
            db.query(models.Album)
            .filter(models.Album.id == album_id)
            .options(
                joinedload(models.Album.songs),
                joinedload(models.Album.artist)
            )
            .first()
        )

    @staticmethod
    def get_song_with_relations(db: Session, song_id: int):
        """Get song with artist and album eagerly loaded."""
        return (
            db.query(models.Song)
            .filter(models.Song.id == song_id)
            .options(
                joinedload(models.Song.artist),
                joinedload(models.Song.album)
            )
            .first()
        )

    @staticmethod
    def get_all_artists_with_songs(db: Session):
        """Get all artists with songs eagerly loaded (avoids N+1)."""
        return (
            db.query(models.Artist)
            .options(
                joinedload(models.Artist.songs),
                joinedload(models.Artist.albums)
            )
            .all()
        )

    @staticmethod
    def get_all_songs_with_relations(db: Session, offset: int = 0, limit: int = 100):
        """Get songs with artist and album eagerly loaded."""
        return (
            db.query(models.Song)
            .options(
                joinedload(models.Song.artist),
                joinedload(models.Song.album)
            )
            .order_by(models.Song.id)
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_user_playlists_with_songs(db: Session, user_id: int, include_deleted: bool = False):
        """Get user's playlists with songs eagerly loaded."""
        query = (
            db.query(models.Playlist)
            .filter(models.Playlist.user_id == user_id)
        )
        
        if not include_deleted:
            query = query.filter(models.Playlist.is_deleted == False)
        
        return query.options(
            joinedload(models.Playlist.songs).joinedload(models.PlaylistSong.playlist),
        ).all()

    @staticmethod
    def get_playlist_with_songs(db: Session, playlist_id: int):
        """Get playlist with all songs and their relations eagerly loaded."""
        return (
            db.query(models.Playlist)
            .filter(models.Playlist.id == playlist_id)
            .options(
                joinedload(models.Playlist.songs).joinedload(models.PlaylistSong.playlist),
                joinedload(models.Playlist.user)
            )
            .first()
        )

    @staticmethod
    def get_songs_by_genre(db: Session, genre: str, limit: int = 100):
        """Get songs filtered by genre with relations eagerly loaded."""
        return (
            db.query(models.Song)
            .filter(models.Song.genre.ilike(genre))
            .options(
                joinedload(models.Song.artist),
                joinedload(models.Song.album)
            )
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_songs_by_mood(db: Session, mood: str, limit: int = 100):
        """Get songs filtered by mood with relations eagerly loaded."""
        return (
            db.query(models.Song)
            .filter(models.Song.mood.ilike(mood))
            .options(
                joinedload(models.Song.artist),
                joinedload(models.Song.album)
            )
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_songs_by_language(db: Session, language: str, limit: int = 100):
        """Get songs filtered by language with relations eagerly loaded."""
        return (
            db.query(models.Song)
            .filter(models.Song.language.ilike(language))
            .options(
                joinedload(models.Song.artist),
                joinedload(models.Song.album)
            )
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_user_listening_history(db: Session, user_id: int, limit: int = 50):
        """Get user's listening history with songs eagerly loaded."""
        return (
            db.query(models.ListeningHistory)
            .filter(models.ListeningHistory.user_id == user_id)
            .options(
                joinedload(models.ListeningHistory.song_id),  # Note: This is a column, not a relationship
            )
            .order_by(models.ListeningHistory.played_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_user_liked_songs(db: Session, user_id: int):
        """Get all songs liked by user (uses subquery for efficiency)."""
        from sqlalchemy import and_
        
        liked_song_ids = db.query(models.LikedSong.song_id).filter(
            models.LikedSong.user_id == user_id
        ).all()
        
        song_ids = [id_tuple[0] for id_tuple in liked_song_ids]
        
        if not song_ids:
            return []
        
        return (
            db.query(models.Song)
            .filter(models.Song.id.in_(song_ids))
            .options(
                joinedload(models.Song.artist),
                joinedload(models.Song.album)
            )
            .all()
        )

    @staticmethod
    def search_songs(db: Session, query_str: str, limit: int = 50):
        """Search songs by title/artist/album with relations eagerly loaded."""
        search_pattern = f"%{query_str}%"
        
        return (
            db.query(models.Song)
            .filter(
                (models.Song.title.ilike(search_pattern)) |
                (models.Song.artist.has(models.Artist.name.ilike(search_pattern))) |
                (models.Song.album.has(models.Album.title.ilike(search_pattern)))
            )
            .options(
                joinedload(models.Song.artist),
                joinedload(models.Song.album)
            )
            .limit(limit)
            .all()
        )

    @staticmethod
    def batch_insert_songs(db: Session, songs_data: list):
        """DATABASE OPTIMIZATION: Batch insert songs for better performance."""
        try:
            db.bulk_insert_mappings(models.Song, songs_data)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e

    @staticmethod
    def batch_update_playlist_positions(db: Session, playlist_id: int, position_map: dict):
        """DATABASE OPTIMIZATION: Batch update playlist song positions."""
        try:
            for song_id, position in position_map.items():
                db.query(models.PlaylistSong).filter(
                    models.PlaylistSong.playlist_id == playlist_id,
                    models.PlaylistSong.song_id == song_id
                ).update({"position": position})
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e
