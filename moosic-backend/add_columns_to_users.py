import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent / "moosic.db"


def get_columns(conn):
    cur = conn.execute("PRAGMA table_info('users')")
    return [row[1] for row in cur.fetchall()]


def main():
    if not DB_PATH.exists():
        print(f"Database not found at: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    try:
        cols = get_columns(conn)
        print("Existing users columns:", cols)

        if "name" not in cols:
            print("Adding 'name' column...")
            conn.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        else:
            print("'name' column already present")

        if "role" not in cols:
            print("Adding 'role' column with default 'user'...")
            conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
        else:
            print("'role' column already present")

        # Ensure existing rows have non-null role and name (defensive)
        conn.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
        conn.execute("UPDATE users SET name = '' WHERE name IS NULL")

        conn.commit()

        cols_after = get_columns(conn)
        print("Users columns after change:")
        for i, c in enumerate(cols_after):
            print(i + 1, c)

    finally:
        conn.close()


if __name__ == '__main__':
    main()
