import os
import shutil
import sqlite3
import tempfile
from pathlib import Path


def main():
    test_record = (1, "recovery_check", "ok")
    temp_dir = Path(tempfile.mkdtemp(prefix="moosic_backup_test_"))
    db_path = temp_dir / "temp_moosic.db"
    backup_path = temp_dir / "temp_moosic_backup.db"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS test_recovery (id INTEGER PRIMARY KEY, name TEXT, value TEXT)")
    cursor.execute("INSERT INTO test_recovery (id, name, value) VALUES (?, ?, ?)", test_record)
    conn.commit()
    conn.close()

    source = sqlite3.connect(db_path)
    target = sqlite3.connect(backup_path)
    source.backup(target)
    source.close()
    target.close()
    backup_created = backup_path.exists() and backup_path.stat().st_size > 0
    print(f"Backup created: {str(backup_created).title()}")

    os.remove(db_path)
    failure_simulated = not db_path.exists()
    print(f"Database failure simulated: {str(failure_simulated).title()}")

    shutil.copy2(backup_path, db_path)
    database_restored = db_path.exists()
    print(f"Database restored: {str(database_restored).title()}")

    restored_conn = sqlite3.connect(db_path)
    recovered = restored_conn.execute(
        "SELECT COUNT(*) FROM test_recovery WHERE id = ? AND name = ? AND value = ?",
        test_record,
    ).fetchone()[0]
    restored_conn.close()
    recovered_ok = recovered == 1
    print(f"Recovered test record: {str(recovered_ok).title()}")
    print("Recovery test: PASS" if database_restored and recovered_ok else "Recovery test: FAIL")


if __name__ == "__main__":
    main()
