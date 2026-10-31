"""Exécute les scripts sql/*.sql dans l'ordre sur Snowflake.

Usage : python scripts/deploy_sql.py [--skip-data]
Variables : SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD (ou SNOWFLAKE_TOKEN pour OAuth),
            SNOWFLAKE_ROLE, SNOWFLAKE_WAREHOUSE.
"""
import os
import sys
from pathlib import Path

import snowflake.connector

SQL_DIR = Path(__file__).resolve().parent.parent / "sql"


def connect():
    params = dict(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        role=os.getenv("SNOWFLAKE_ROLE", "ACCOUNTADMIN"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
    )
    if os.getenv("SNOWFLAKE_HOST"):
        params["host"] = os.environ["SNOWFLAKE_HOST"]
    if os.getenv("SNOWFLAKE_TOKEN"):
        params.update(authenticator="oauth", token=os.environ["SNOWFLAKE_TOKEN"])
    else:
        params.update(user=os.environ["SNOWFLAKE_USER"], password=os.environ["SNOWFLAKE_PASSWORD"])
    return snowflake.connector.connect(**params)


def main():
    skip_data = "--skip-data" in sys.argv
    conn = connect()
    for f in sorted(SQL_DIR.glob("*.sql")):
        if f.name.startswith("00_"):  # fichier complet pour Snowsight, doublon des scripts 01 à 07
            continue
        if skip_data and f.name.startswith(("02_", "03_")):
            continue
        print(f"==> {f.name}")
        with open(f, encoding="utf-8") as fh:
            for cur in conn.execute_stream(fh, remove_comments=True):
                print("   ", (cur.query or "").strip().splitlines()[0][:90])
    conn.close()
    print("OK")


if __name__ == "__main__":
    main()
