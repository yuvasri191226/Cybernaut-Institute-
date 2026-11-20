"""
db.py - MySQL Connection Helper & Query Utility
===============================================
Cybernaut Institute of Technology - Announcement System Backend

Provides connection management and thread-safe / context-aware database
helpers using PyMySQL with DictCursor for dictionary row access.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import pymysql
from pymysql.cursors import DictCursor
from flask import g, has_app_context
from config import Config

logger = logging.getLogger(__name__)


def get_db_connection() -> pymysql.Connection:
    """Create and return a raw MySQL database connection."""
    cfg = Config.get_db_config()
    return pymysql.connect(
        cursorclass=DictCursor,
        **cfg
    )


def get_db() -> pymysql.Connection:
    """
    Get or create a database connection for the current application context.
    Reuses the connection throughout the lifetime of a single request.
    """
    if has_app_context():
        if "_database" not in g:
            g._database = get_db_connection()
        return g._database
    return get_db_connection()


def close_db(error: Optional[BaseException] = None) -> None:
    """Close the database connection at the end of the request."""
    if has_app_context():
        db = g.pop("_database", None)
        if db is not None:
            try:
                db.close()
            except Exception as e:
                logger.error(f"Error closing database connection: {e}")


def query_db(
    query: str,
    args: Union[tuple, list, dict] = (),
    one: bool = False
) -> Union[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Execute a SELECT query and return rows as dictionaries.

    :param query: SQL statement with %s placeholders
    :param args: Tuple, list, or dict of parameters
    :param one: If True, returns a single row dict (or None)
    :return: List of dicts, or single dict / None
    """
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute(query, args)
        if one:
            return cursor.fetchone()
        return cursor.fetchall()


def execute_db(
    query: str,
    args: Union[tuple, list, dict] = (),
    commit: bool = True
) -> int:
    """
    Execute an INSERT, UPDATE, or DELETE statement.

    :param query: SQL statement with %s placeholders
    :param args: Parameters for query
    :param commit: If True, commits the transaction
    :return: lastrowid on INSERT, or rowcount on UPDATE/DELETE
    """
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute(query, args)
        if commit:
            db.commit()
        if cursor.lastrowid and cursor.lastrowid > 0:
            return cursor.lastrowid
        return cursor.rowcount


def test_connection() -> Tuple[bool, str]:
    """
    Test connectivity to the MySQL database.
    Returns (True, message) on success, or (False, error_details) on failure.
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT DATABASE() AS db_name, VERSION() AS version;")
            row = cursor.fetchone()
        conn.close()
        return True, f"Connected to {row['db_name']} (MySQL {row['version']})"
    except Exception as exc:
        return False, str(exc)
