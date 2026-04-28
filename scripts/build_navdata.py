#!/usr/bin/env python3
import argparse
import csv
import sqlite3
import sys
from pathlib import Path


AIRPORT_COLUMNS = [
    "id",
    "ident",
    "type",
    "name",
    "latitude_deg",
    "longitude_deg",
    "elevation_ft",
    "continent",
    "iso_country",
    "iso_region",
    "municipality",
    "gps_code",
    "iata_code",
    "local_code",
]

RUNWAY_COLUMNS = [
    "id",
    "airport_ident",
    "length_ft",
    "width_ft",
    "surface",
    "lighted",
    "closed",
    "le_ident",
    "le_latitude_deg",
    "le_longitude_deg",
    "le_elevation_ft",
    "le_heading_degT",
    "le_displaced_threshold_ft",
    "he_ident",
    "he_latitude_deg",
    "he_longitude_deg",
    "he_elevation_ft",
    "he_heading_degT",
    "he_displaced_threshold_ft",
]


def clean_text(value):
    if value is None:
        return None
    value = value.strip()
    return value if value else None


def clean_int(value):
    value = clean_text(value)
    if value is None:
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def clean_float(value):
    value = clean_text(value)
    if value is None:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def clean_bool_int(value):
    value = clean_text(value)
    if value is None:
        return 0
    return 1 if value.lower() in {"1", "true", "yes", "y"} else 0


def require_file(path):
    if not path.exists():
        raise FileNotFoundError(f"Required input file is missing: {path}")
    if not path.is_file():
        raise FileNotFoundError(f"Required input path is not a file: {path}")


def create_schema(conn):
    conn.executescript(
        """
        CREATE TABLE airports (
            id INTEGER PRIMARY KEY,
            ident TEXT UNIQUE NOT NULL,
            type TEXT,
            name TEXT NOT NULL,
            latitude_deg REAL,
            longitude_deg REAL,
            elevation_ft INTEGER,
            continent TEXT,
            iso_country TEXT,
            iso_region TEXT,
            municipality TEXT,
            gps_code TEXT,
            iata_code TEXT,
            local_code TEXT
        );

        CREATE TABLE runways (
            id INTEGER PRIMARY KEY,
            airport_ident TEXT NOT NULL,
            length_ft INTEGER,
            width_ft INTEGER,
            surface TEXT,
            lighted INTEGER,
            closed INTEGER,
            le_ident TEXT,
            le_latitude_deg REAL,
            le_longitude_deg REAL,
            le_elevation_ft INTEGER,
            le_heading_degT REAL,
            le_displaced_threshold_ft INTEGER,
            he_ident TEXT,
            he_latitude_deg REAL,
            he_longitude_deg REAL,
            he_elevation_ft INTEGER,
            he_heading_degT REAL,
            he_displaced_threshold_ft INTEGER
        );

        CREATE TABLE runway_ends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            airport_ident TEXT NOT NULL,
            runway_ident TEXT NOT NULL,
            opposite_ident TEXT,
            latitude_deg REAL,
            longitude_deg REAL,
            elevation_ft INTEGER,
            heading_degT REAL,
            displaced_threshold_ft INTEGER,
            length_ft INTEGER,
            width_ft INTEGER,
            surface TEXT,
            lighted INTEGER,
            closed INTEGER
        );

        CREATE INDEX idx_airports_ident ON airports(ident);
        CREATE INDEX idx_airports_name ON airports(name);
        CREATE INDEX idx_airports_iso_country ON airports(iso_country);
        CREATE INDEX idx_runways_airport_ident ON runways(airport_ident);
        CREATE INDEX idx_runway_ends_airport_ident ON runway_ends(airport_ident);
        CREATE INDEX idx_runway_ends_runway_ident ON runway_ends(runway_ident);
        """
    )


def import_airports(conn, airports_csv, include_closed):
    imported_idents = set()
    count = 0

    insert_sql = f"""
        INSERT INTO airports ({", ".join(AIRPORT_COLUMNS)})
        VALUES ({", ".join("?" for _ in AIRPORT_COLUMNS)})
    """

    with airports_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            airport_type = clean_text(row.get("type"))
            if (
                airport_type is not None
                and airport_type.lower() == "closed"
                and not include_closed
            ):
                continue

            ident = clean_text(row.get("ident"))
            name = clean_text(row.get("name"))
            airport_id = clean_int(row.get("id"))
            if airport_id is None or ident is None or name is None:
                continue

            values = [
                airport_id,
                ident,
                airport_type,
                name,
                clean_float(row.get("latitude_deg")),
                clean_float(row.get("longitude_deg")),
                clean_int(row.get("elevation_ft")),
                clean_text(row.get("continent")),
                clean_text(row.get("iso_country")),
                clean_text(row.get("iso_region")),
                clean_text(row.get("municipality")),
                clean_text(row.get("gps_code")),
                clean_text(row.get("iata_code")),
                clean_text(row.get("local_code")),
            ]
            conn.execute(insert_sql, values)
            imported_idents.add(ident)
            count += 1

    return count, imported_idents


def runway_values(row):
    return [
        clean_int(row.get("id")),
        clean_text(row.get("airport_ident")),
        clean_int(row.get("length_ft")),
        clean_int(row.get("width_ft")),
        clean_text(row.get("surface")),
        clean_bool_int(row.get("lighted")),
        clean_bool_int(row.get("closed")),
        clean_text(row.get("le_ident")),
        clean_float(row.get("le_latitude_deg")),
        clean_float(row.get("le_longitude_deg")),
        clean_int(row.get("le_elevation_ft")),
        clean_float(row.get("le_heading_degT")),
        clean_int(row.get("le_displaced_threshold_ft")),
        clean_text(row.get("he_ident")),
        clean_float(row.get("he_latitude_deg")),
        clean_float(row.get("he_longitude_deg")),
        clean_int(row.get("he_elevation_ft")),
        clean_float(row.get("he_heading_degT")),
        clean_int(row.get("he_displaced_threshold_ft")),
    ]


def runway_end_values(runway, prefix, opposite_prefix):
    runway_ident = runway[f"{prefix}_ident"]
    if runway_ident is None:
        return None

    return [
        runway["airport_ident"],
        runway_ident,
        runway[f"{opposite_prefix}_ident"],
        runway[f"{prefix}_latitude_deg"],
        runway[f"{prefix}_longitude_deg"],
        runway[f"{prefix}_elevation_ft"],
        runway[f"{prefix}_heading_degT"],
        runway[f"{prefix}_displaced_threshold_ft"],
        runway["length_ft"],
        runway["width_ft"],
        runway["surface"],
        runway["lighted"],
        runway["closed"],
    ]


def import_runways(conn, runways_csv, imported_airports, include_closed):
    runway_count = 0
    runway_end_count = 0

    insert_runway_sql = f"""
        INSERT INTO runways ({", ".join(RUNWAY_COLUMNS)})
        VALUES ({", ".join("?" for _ in RUNWAY_COLUMNS)})
    """
    insert_runway_end_sql = """
        INSERT INTO runway_ends (
            airport_ident,
            runway_ident,
            opposite_ident,
            latitude_deg,
            longitude_deg,
            elevation_ft,
            heading_degT,
            displaced_threshold_ft,
            length_ft,
            width_ft,
            surface,
            lighted,
            closed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    with runways_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            values = runway_values(row)
            runway = dict(zip(RUNWAY_COLUMNS, values))

            if runway["id"] is None or runway["airport_ident"] is None:
                continue
            if runway["airport_ident"] not in imported_airports:
                continue
            if runway["closed"] == 1 and not include_closed:
                continue

            conn.execute(insert_runway_sql, values)
            runway_count += 1

            for prefix, opposite_prefix in (("le", "he"), ("he", "le")):
                end_values = runway_end_values(runway, prefix, opposite_prefix)
                if end_values is None:
                    continue
                conn.execute(insert_runway_end_sql, end_values)
                runway_end_count += 1

    return runway_count, runway_end_count


def build_database(args):
    raw_dir = args.raw_dir
    out_db = args.out_db
    airports_csv = raw_dir / "airports.csv"
    runways_csv = raw_dir / "runways.csv"

    require_file(airports_csv)
    require_file(runways_csv)

    out_db.parent.mkdir(parents=True, exist_ok=True)
    if out_db.exists():
        out_db.unlink()

    with sqlite3.connect(out_db) as conn:
        create_schema(conn)
        with conn:
            airport_count, imported_airports = import_airports(
                conn, airports_csv, args.include_closed_airports
            )
            runway_count, runway_end_count = import_runways(
                conn,
                runways_csv,
                imported_airports,
                args.include_closed_runways,
            )

    print(f"Imported airports: {airport_count}")
    print(f"Imported runways: {runway_count}")
    print(f"Generated runway ends: {runway_end_count}")
    print(f"Output database: {out_db}")


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Build navdata.sqlite from OurAirports airports.csv and runways.csv."
    )
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument("--out-db", type=Path, required=True)
    parser.add_argument("--include-closed-airports", action="store_true")
    parser.add_argument("--include-closed-runways", action="store_true")
    return parser.parse_args(argv)


def main(argv):
    args = parse_args(argv)
    try:
        build_database(args)
    except OSError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except sqlite3.Error as exc:
        print(f"SQLite error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
