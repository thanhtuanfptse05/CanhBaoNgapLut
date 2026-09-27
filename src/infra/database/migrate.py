"""
Database Migration & Seed Script for Supabase PostgreSQL
Usage:
  uv run --with psycopg[binary] python src/infra/database/migrate.py [DB_PASSWORD]
"""

import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import psycopg
except ImportError:
    print("Error: psycopg is not installed. Run with: uv run --with psycopg[binary] python src/infra/database/migrate.py")
    sys.exit(1)

def run_migrations():
    # Load .env if present
    env_path = Path(__file__).resolve().parents[3] / ".env"
    db_password = sys.argv[1] if len(sys.argv) > 1 else None
    project_id = "atjyhnewynqblnmbtdog"
    db_host = "aws-0-ap-northeast-1.pooler.supabase.com"
    db_port = 6543
    db_user = f"postgres.{project_id}"
    db_name = "postgres"

    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DB_PASSWORD=") and not db_password:
                    val = line.split("=", 1)[1].strip()
                    if val and not val.startswith("["):
                        db_password = val

    if not db_password:
        print("Vui lòng cung cấp Database Password:")
        print("Cú pháp: uv run --with psycopg[binary] python src/infra/database/migrate.py <MAT_KHAU_DB>")
        sys.exit(1)

    print(f"Connecting to Supabase PostgreSQL ({db_host}:{db_port})...")

    db_dir = Path(__file__).parent
    schema_file = db_dir / "schema.sql"
    seed_file = db_dir / "seed_provinces.sql"

    try:
        with psycopg.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            dbname=db_name,
            sslmode="require",
            connect_timeout=15
        ) as conn:
            with conn.cursor() as cur:
                print(f"Applying schema from: {schema_file.name}...")
                with open(schema_file, "r", encoding="utf-8") as f:
                    schema_sql = f.read()
                cur.execute(schema_sql)
                conn.commit()
                print(" Schema applied successfully!")

                if seed_file.exists():
                    print(f"Applying seed data from: {seed_file.name}...")
                    with open(seed_file, "r", encoding="utf-8") as f:
                        seed_sql = f.read()
                    cur.execute(seed_sql)
                    conn.commit()
                    print(" Seed data applied successfully!")

            print("\n Hoàn tất khởi tạo toàn bộ bảng và dữ liệu mẫu lên Supabase!")

    except Exception as e:
        print(f"\n Lỗi kết nối hoặc thực thi SQL: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations()
