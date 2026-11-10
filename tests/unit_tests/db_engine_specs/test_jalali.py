# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""Tests for Jalali calendar time grains."""

import sqlite3
from datetime import date, timedelta
from typing import Any
from unittest.mock import patch

import pytest

from superset.db_engine_specs.jalali import (
    jalali_time_grain_expressions,
    JalaliDialect,
    JalaliTimeGrain,
)

# Gregorian date of 1 Farvardin (Nowruz) for each Jalali year, taken from the
# reference implementation jalaali-js. Every other Jalali date follows from it:
# months 1-6 have 31 days, months 7-11 have 30, and Esfand has 29 or 30.
NOWRUZ = {
    1370: date(1991, 3, 21),
    1371: date(1992, 3, 21),
    1372: date(1993, 3, 21),
    1373: date(1994, 3, 21),
    1374: date(1995, 3, 21),
    1375: date(1996, 3, 20),
    1376: date(1997, 3, 21),
    1377: date(1998, 3, 21),
    1378: date(1999, 3, 21),
    1379: date(2000, 3, 20),
    1380: date(2001, 3, 21),
    1381: date(2002, 3, 21),
    1382: date(2003, 3, 21),
    1383: date(2004, 3, 20),
    1384: date(2005, 3, 21),
    1385: date(2006, 3, 21),
    1386: date(2007, 3, 21),
    1387: date(2008, 3, 20),
    1388: date(2009, 3, 21),
    1389: date(2010, 3, 21),
    1390: date(2011, 3, 21),
    1391: date(2012, 3, 20),
    1392: date(2013, 3, 21),
    1393: date(2014, 3, 21),
    1394: date(2015, 3, 21),
    1395: date(2016, 3, 20),
    1396: date(2017, 3, 21),
    1397: date(2018, 3, 21),
    1398: date(2019, 3, 21),
    1399: date(2020, 3, 20),
    1400: date(2021, 3, 21),
    1401: date(2022, 3, 21),
    1402: date(2023, 3, 21),
    1403: date(2024, 3, 20),
    1404: date(2025, 3, 21),
    1405: date(2026, 3, 21),
    1406: date(2027, 3, 21),
    1407: date(2028, 3, 20),
    1408: date(2029, 3, 20),
    1409: date(2030, 3, 21),
    1410: date(2031, 3, 21),
    1411: date(2032, 3, 20),
}

SQLITE_DIALECT = JalaliDialect(
    epoch_days="CAST(julianday(DATE({col})) - julianday('1970-01-01') AS INTEGER)",
    minus_days="DATE(DATE({col}), '-' || {days} || ' days')",
)


def _month_offsets() -> list[int]:
    """Day-of-year offset of the first day of each Jalali month."""
    return [31 * m if m <= 6 else 186 + 30 * (m - 6) for m in range(12)]


def _expected(day: date) -> tuple[date, date, date]:
    """Jalali month, quarter and year starts for a Gregorian date."""
    year = max(y for y, nowruz in NOWRUZ.items() if nowruz <= day)
    day_of_year = (day - NOWRUZ[year]).days
    offsets = _month_offsets()
    month = max(m for m, offset in enumerate(offsets) if offset <= day_of_year)
    quarter_month = month - month % 3
    return (
        NOWRUZ[year] + timedelta(days=offsets[month]),
        NOWRUZ[year] + timedelta(days=offsets[quarter_month]),
        NOWRUZ[year],
    )


def _run_sqlite(days: list[date]) -> list[tuple[Any, ...]]:
    expressions = jalali_time_grain_expressions(SQLITE_DIALECT)
    columns = ", ".join(
        expressions[grain].replace("{col}", "ts")
        for grain in (
            JalaliTimeGrain.MONTH,
            JalaliTimeGrain.QUARTER,
            JalaliTimeGrain.YEAR,
        )
    )
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE t (i INTEGER, ts TEXT)")
    conn.executemany(
        "INSERT INTO t VALUES (?, ?)",
        [(i, f"{day.isoformat()} 13:45:00") for i, day in enumerate(days)],
    )
    return conn.execute(f"SELECT {columns} FROM t ORDER BY i").fetchall()  # noqa: S608


def test_grain_keys() -> None:
    expressions = jalali_time_grain_expressions(SQLITE_DIALECT)
    assert set(expressions) == {"JALALI_MONTH", "JALALI_QUARTER", "JALALI_YEAR"}
    assert all("{col}" in expression for expression in expressions.values())


def test_every_day_of_four_decades_matches_the_calendar() -> None:
    """Covers ordinary and leap years (e.g. 1375, 1399, 1403) day by day."""
    first, last = NOWRUZ[1370], NOWRUZ[1411] - timedelta(days=1)
    days = [first + timedelta(days=i) for i in range((last - first).days + 1)]

    rows = _run_sqlite(days)

    mismatches = [
        (day, row)
        for day, row in zip(days, rows, strict=True)
        if tuple(date.fromisoformat(value) for value in row) != _expected(day)
    ]
    assert not mismatches, mismatches[:5]


@pytest.mark.parametrize(
    "day,month_start,quarter_start,year_start",
    [
        # Nowruz 1403 and the last day of the leap year 1403 (30 Esfand).
        (date(2024, 3, 20), date(2024, 3, 20), date(2024, 3, 20), date(2024, 3, 20)),
        (date(2025, 3, 20), date(2025, 2, 19), date(2024, 12, 21), date(2024, 3, 20)),
        # 1 Dey 1403 opens both a month and the fourth quarter.
        (date(2024, 12, 21), date(2024, 12, 21), date(2024, 12, 21), date(2024, 3, 20)),
        # 31 Shahrivar 1403, the last 31-day month day.
        (date(2024, 9, 21), date(2024, 8, 22), date(2024, 6, 21), date(2024, 3, 20)),
        # 1 January is an ordinary day in Dey.
        (date(2025, 1, 1), date(2024, 12, 21), date(2024, 12, 21), date(2024, 3, 20)),
    ],
)
def test_known_dates(
    day: date, month_start: date, quarter_start: date, year_start: date
) -> None:
    (row,) = _run_sqlite([day])
    assert tuple(date.fromisoformat(value) for value in row) == (
        month_start,
        quarter_start,
        year_start,
    )


def test_mod_template_is_used() -> None:
    dialect = JalaliDialect(
        epoch_days="days({col})", minus_days="minus({col}, {days})", mod="MOD({a}, {b})"
    )
    expression = jalali_time_grain_expressions(dialect)[JalaliTimeGrain.YEAR]
    assert "MOD(" in expression
    assert "%" not in expression
    assert expression.startswith("minus({col}, ")


@pytest.mark.parametrize("calendar,offered", [("jalali", True), ("gregorian", False)])
def test_grains_are_offered_only_for_the_jalali_calendar(
    app_context: None, calendar: str, offered: bool
) -> None:
    from flask import current_app

    from superset.db_engine_specs.base import BaseEngineSpec
    from superset.db_engine_specs.postgres import PostgresEngineSpec
    from superset.db_engine_specs.sqlite import SqliteEngineSpec

    with patch.dict(current_app.config, {"CALENDAR": calendar}):
        for spec in (SqliteEngineSpec, PostgresEngineSpec):
            expressions = spec.get_time_grain_expressions()
            grains = {grain.duration: grain.label for grain in spec.get_time_grains()}
            assert ("JALALI_MONTH" in expressions) is offered
            assert ("JALALI_MONTH" in grains) is offered
            if offered:
                assert grains["JALALI_YEAR"] == "Jalali year"
        # Engines without a Jalali dialect never offer the grains.
        assert "JALALI_MONTH" not in BaseEngineSpec.get_time_grain_expressions()


def test_denylist_still_applies(app_context: None) -> None:
    from flask import current_app

    from superset.db_engine_specs.sqlite import SqliteEngineSpec

    with patch.dict(
        current_app.config,
        {"CALENDAR": "jalali", "TIME_GRAIN_DENYLIST": ["JALALI_QUARTER"]},
    ):
        expressions = SqliteEngineSpec.get_time_grain_expressions()
    assert "JALALI_MONTH" in expressions
    assert "JALALI_QUARTER" not in expressions
