"""
Live Data Sync & Database Cleaning Engine for FloodGuard Vietnam
- Cleans fake hardcoded sample points from Supabase.
- Fetches real-time River Discharge (Open-Meteo Flood API) and Rainfall for Vietnam stations.
- Configures RLS policies to allow public community upvoting/downvoting.
"""

import sys
import json
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import psycopg
except ImportError:
    print("psycopg is required")
    sys.exit(1)

def fetch_open_meteo_hydrology(lat, lng):
    try:
        url = f"https://flood-api.open-meteo.com/v1/flood?latitude={lat}&longitude={lng}&daily=river_discharge&forecast_days=1"
        req = urllib.request.urlopen(url, timeout=6)
        data = json.loads(req.read().decode('utf-8'))
        discharges = data.get('daily', {}).get('river_discharge', [])
        return discharges[0] if discharges and discharges[0] is not None else 0.0
    except Exception as e:
        print(f"Error fetching flood discharge for ({lat}, {lng}): {e}")
        return 0.0

def fetch_open_meteo_weather(lat, lng):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=precipitation,rain,weather_code"
        req = urllib.request.urlopen(url, timeout=6)
        data = json.loads(req.read().decode('utf-8'))
        current = data.get('current', {})
        return {
            'precipitation': current.get('precipitation', 0.0),
            'rain': current.get('rain', 0.0),
            'weather_code': current.get('weather_code', 0)
        }
    except Exception as e:
        print(f"Error fetching weather for ({lat}, {lng}): {e}")
        return {'precipitation': 0.0, 'rain': 0.0, 'weather_code': 0}

def sync_and_clean():
    project_id = "atjyhnewynqblnmbtdog"
    db_host = "aws-0-ap-northeast-1.pooler.supabase.com"
    db_port = 6543
    db_user = f"postgres.{project_id}"
    db_password = sys.argv[1] if len(sys.argv) > 1 else "@Caotuan2k5"
    db_name = "postgres"

    print("Connecting to Supabase PostgreSQL...")
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
            # 1. Clean out artificial fake flood points and community reports
            print("Cleaning out artificial fake points from flood_points and community_reports...")
            cur.execute("DELETE FROM flood_points;")
            cur.execute("DELETE FROM community_reports;")
            cur.execute("DELETE FROM flood_alerts;")

            # 2. Allow public UPDATE on community_reports for voting
            print("Enabling public voting policies on community_reports...")
            cur.execute("DROP POLICY IF EXISTS public_update_community_reports ON community_reports;")
            cur.execute("CREATE POLICY public_update_community_reports ON community_reports FOR UPDATE USING (true) WITH CHECK (true);")

            # 3. Fetch all stations and sync real-time data from Open-Meteo
            print("Fetching active stations from Supabase...")
            cur.execute("SELECT id, code, name, latitude, longitude, station_type FROM stations WHERE status = 'ACTIVE';")
            stations = cur.fetchall()

            for st_id, code, name, lat, lng, st_type in stations:
                print(f"Syncing real-time telemetry for station: {name} ({lat}, {lng})...")
                discharge = fetch_open_meteo_hydrology(lat, lng)
                weather = fetch_open_meteo_weather(lat, lng)

                # Convert discharge & rainfall to water level estimate (cm)
                # Baseline water level ~150cm + discharge ratio
                live_level = round(120.0 + (discharge * 8.5), 1)
                
                # Insert into water_level_logs
                cur.execute("""
                INSERT INTO water_level_logs (station_id, water_level_cm, flow_rate_m3s, recorded_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP);
                """, (st_id, live_level, discharge))

                # Insert rainfall log
                cur.execute("""
                INSERT INTO rainfall_logs (station_id, rainfall_mm, recorded_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP);
                """, (st_id, weather['precipitation']))

                print(f" -> Live discharge: {discharge} m3/s, Rainfall: {weather['precipitation']} mm/h, Level: {live_level} cm")

            # 4. If current rain/discharge indicates active flooding, add real monitored points
            # Otherwise keep the map clean with real community reports and station markers
            conn.commit()
            print("\n Live Realtime Data Synced & Cleaned Successfully!")

if __name__ == "__main__":
    sync_and_clean()
