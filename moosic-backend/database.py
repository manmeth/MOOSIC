from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_PATH = Path(__file__).resolve().parent / "moosic.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
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
)

Base = declarative_base()


def ensure_song_language_column():
    inspector = inspect(engine)
    if "songs" not in inspector.get_table_names():
        return

    columns = [column["name"] for column in inspector.get_columns("songs")]
    if "language" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE songs ADD COLUMN language VARCHAR"))


def create_tables():
    Base.metadata.create_all(bind=engine)
    ensure_song_language_column()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()