from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

DATABASE_PATH = Path(__file__).resolve().parent / "moosic.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

# DATABASE OPTIMIZATION: Connection pooling and pooling configuration
# For SQLite, we use StaticPool to ensure connection reuse
# Pre-ping connections to detect stale connections early
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # Reuse single connection for SQLite
    pool_pre_ping=True,  # Verify connections before using them
    echo=False,  # Set to True for SQL debugging
)


@event.listens_for(engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # Reduce unnecessary queries after commit
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
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {definition}"))


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
                connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))

    if "playlists" in inspector.get_table_names():
        columns = [column["name"] for column in inspector.get_columns("playlists")]
        if "description" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE playlists ADD COLUMN description VARCHAR"))

    if "listening_history" in inspector.get_table_names():
        columns = [column["name"] for column in inspector.get_columns("listening_history")]
        additions = {
            "progress_seconds": "INTEGER DEFAULT 0",
            "completed": "BOOLEAN DEFAULT 0",
            "skipped": "BOOLEAN DEFAULT 0",
        }
        missing = [(name, definition) for name, definition in additions.items() if name not in columns]
        if missing:
            with engine.begin() as connection:
                for name, definition in missing:
                    connection.execute(text(f"ALTER TABLE listening_history ADD COLUMN {name} {definition}"))

    if "playlist_songs" in inspector.get_table_names():
        columns = [column["name"] for column in inspector.get_columns("playlist_songs")]
        if "position" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE playlist_songs ADD COLUMN position INTEGER DEFAULT 0"))

    if "songs" in inspector.get_table_names():
        columns = [column["name"] for column in inspector.get_columns("songs")]
        if "mood" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE songs ADD COLUMN mood VARCHAR"))


def create_tables():
    Base.metadata.create_all(bind=engine)
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