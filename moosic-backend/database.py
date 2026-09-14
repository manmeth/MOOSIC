import os
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool


# Local development:
#   - no DATABASE_URL -> SQLite in moosic-backend/moosic.db
#
# Production / Vercel:
#   - DATABASE_URL set by Neon -> PostgreSQL
_raw_database_url = os.getenv("DATABASE_URL", "").strip()

if _raw_database_url:
    # Neon/Vercel may provide a standard PostgreSQL URL.
    # Explicitly use Psycopg 3 so SQLAlchemy does not look for psycopg2.
    if _raw_database_url.startswith("postgresql://"):
        DATABASE_URL = _raw_database_url.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1,
        )
    elif _raw_database_url.startswith("postgres://"):
        DATABASE_URL = _raw_database_url.replace(
            "postgres://",
            "postgresql+psycopg://",
            1,
        )
    else:
        DATABASE_URL = _raw_database_url
else:
    DATABASE_PATH = Path(__file__).resolve().parent / "moosic.db"
    DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"


IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_POSTGRES = DATABASE_URL.startswith("postgresql")


# Keep the current optimized SQLite behavior locally.
# For Neon/Postgres, use SQLAlchemy's normal connection pool.
if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        pool_pre_ping=True,
        echo=False,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        echo=False,
    )


# SQLite needs foreign-key enforcement enabled explicitly.
if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

Base = declarative_base()


# DATABASE OPTIMIZATION: Transaction management utilities
class TransactionManager:
    """Utility class for managing database transactions safely."""

    @staticmethod
    def commit_with_rollback(session, action_func):
        """Execute action with automatic rollback on error."""
        try:
            result = action_func(session)
            session.commit()
            return result
        except Exception as e:
            session.rollback()
            raise e

    @staticmethod
    def batch_commit(session, operations):
        """Execute multiple operations in a single transaction."""
        try:
            for operation in operations:
                operation(session)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e


def _boolean_default_false() -> str:
    return "FALSE" if IS_POSTGRES else "0"


def _datetime_type() -> str:
    return "TIMESTAMP" if IS_POSTGRES else "DATETIME"


def ensure_user_columns():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = [column["name"] for column in inspector.get_columns("users")]
    for column_name, definition in {
        "name": "VARCHAR",
        "role": "VARCHAR DEFAULT 'user'",
    }.items():
        if column_name not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE users ADD COLUMN {column_name} {definition}")
                )


def ensure_song_language_column():
    inspector = inspect(engine)
    if "songs" not in inspector.get_table_names():
        return

    columns = [column["name"] for column in inspector.get_columns("songs")]
    if "language" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE songs ADD COLUMN language VARCHAR"))


def ensure_compatibility_columns():
    inspector = inspect(engine)

    if "users" in inspector.get_table_names():
        columns = [column["name"] for column in inspector.get_columns("users")]

        if "name" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR"))

        if "role" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'")
                )

        if "is_premium" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN "
                        f"is_premium BOOLEAN DEFAULT {_boolean_default_false()}"
                    )
                )

    if "playlists" in inspector.get_table_names():
        columns = [column["name"] for column in inspector.get_columns("playlists")]
        if "description" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE playlists ADD COLUMN description VARCHAR")
                )

    if "listening_history" in inspector.get_table_names():
        columns = [
            column["name"]
            for column in inspector.get_columns("listening_history")
        ]

        additions = {
            "progress_seconds": "INTEGER DEFAULT 0",
            "completed": f"BOOLEAN DEFAULT {_boolean_default_false()}",
            "skipped": f"BOOLEAN DEFAULT {_boolean_default_false()}",
        }

        missing = [
            (name, definition)
            for name, definition in additions.items()
            if name not in columns
        ]

        if missing:
            with engine.begin() as connection:
                for name, definition in missing:
                    connection.execute(
                        text(
                            "ALTER TABLE listening_history "
                            f"ADD COLUMN {name} {definition}"
                        )
                    )

    if "playlist_songs" in inspector.get_table_names():
        columns = [
            column["name"]
            for column in inspector.get_columns("playlist_songs")
        ]
        if "position" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE playlist_songs "
                        "ADD COLUMN position INTEGER DEFAULT 0"
                    )
                )

    if "songs" in inspector.get_table_names():
        columns = [column["name"] for column in inspector.get_columns("songs")]

        if "mood" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE songs ADD COLUMN mood VARCHAR"))

        if "is_playable" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE songs ADD COLUMN is_playable BOOLEAN")
                )

        if "audio_checked_at" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE songs ADD COLUMN "
                        f"audio_checked_at {_datetime_type()}"
                    )
                )


def ensure_downloads_table():
    # models.py defines the proper SQLAlchemy table for both SQLite and Postgres.
    # Using SQLAlchemy here avoids SQLite-specific CREATE TABLE syntax.
    import models  # noqa: F401

    downloads_table = Base.metadata.tables.get("downloads")
    if downloads_table is not None:
        downloads_table.create(bind=engine, checkfirst=True)


def create_tables():
    # Ensure every model has registered itself on Base.metadata before create_all().
    import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    ensure_downloads_table()
    ensure_user_columns()
    ensure_song_language_column()
    ensure_compatibility_columns()


def get_db():
    """DATABASE OPTIMIZATION: Session factory with proper cleanup.

    Ensures connections are properly closed and transactions are rolled back
    if not explicitly committed.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()