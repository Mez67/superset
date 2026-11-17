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
"""
Jalali (Solar Hijri) calendar period boundaries.

Uses the same day-count arithmetic as the Jalali time grains (see
``superset/db_engine_specs/jalali.py``), which matches the official calendar
for every day from 1925 to 2125.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import TypeVar

from superset.db_engine_specs.jalali import JALALI_EPOCH_DAY_NUMBER

_EPOCH = date(1970, 1, 1)
# Day-of-year offsets of the quarter starts (Farvardin, Tir, Mehr, Dey).
_QUARTER_OFFSETS = (0, 93, 186, 276)


def jalali_day_of_year(day: date) -> int:
    """Zero-based day of the Jalali year that contains ``day``."""
    number = (day - _EPOCH).days + JALALI_EPOCH_DAY_NUMBER
    cycle_day = (number % 12053) % 1461
    return (cycle_day - 1) % 365 if cycle_day > 365 else cycle_day


def jalali_month_start(day: date) -> date:
    day_of_year = jalali_day_of_year(day)
    offset = day_of_year % 31 if day_of_year < 186 else (day_of_year - 186) % 30
    return day - timedelta(days=offset)


def jalali_quarter_start(day: date) -> date:
    day_of_year = jalali_day_of_year(day)
    offset = max(start for start in _QUARTER_OFFSETS if start <= day_of_year)
    return day - timedelta(days=day_of_year - offset)


def jalali_year_start(day: date) -> date:
    return day - timedelta(days=jalali_day_of_year(day))


def jalali_period(unit: str, day: date, shift: int = 0) -> tuple[date, date]:
    """``[start, end)`` of the Jalali month, quarter or year containing ``day``,
    moved ``shift`` periods (``-1`` for the previous one).
    """
    start_of = {
        "month": jalali_month_start,
        "quarter": jalali_quarter_start,
        "year": jalali_year_start,
    }[unit]
    # Stepping past the longest period lands inside the neighbouring one.
    longest = {"month": 31, "quarter": 93, "year": 366}[unit]
    start = start_of(day)
    for _ in range(abs(shift)):
        start = (
            start_of(start - timedelta(days=1))
            if shift < 0
            else start_of(start + timedelta(days=longest))
        )
    return start, start_of(start + timedelta(days=longest))


# Months 1-6 have 31 days, 7-11 have 30 and Esfand (12) has 29 or 30.
_MONTH_OFFSETS = tuple(31 * m if m <= 6 else 186 + 30 * (m - 6) for m in range(12))


def _nowruz(jalali_year: int) -> date:
    """First day (1 Farvardin) of ``jalali_year``; Nowruz falls in March."""
    return jalali_year_start(date(jalali_year + 621, 4, 1))


def jalali_month_length(jalali_year: int, month: int) -> int:
    if month <= 6:
        return 31
    if month <= 11:
        return 30
    year_length = (_nowruz(jalali_year + 1) - _nowruz(jalali_year)).days
    return year_length - 336


def to_jalali(day: date) -> tuple[int, int, int]:
    """``(year, month, day)`` in the Jalali calendar."""
    if isinstance(day, datetime):
        day = day.date()
    start = jalali_year_start(day)
    day_of_year = (day - start).days
    month = max(m for m in range(12) if _MONTH_OFFSETS[m] <= day_of_year)
    return start.year - 621, month + 1, day_of_year - _MONTH_OFFSETS[month] + 1


def from_jalali(year: int, month: int, day: int) -> date:
    """Gregorian date of the Jalali ``year``-``month``-``day``."""
    if not 1 <= month <= 12 or not 1 <= day <= jalali_month_length(year, month):
        raise ValueError(f"Invalid Jalali date: {year}-{month}-{day}")
    return _nowruz(year) + timedelta(days=_MONTH_OFFSETS[month - 1] + day - 1)


_D = TypeVar("_D", bound=date)


def add_jalali_months(value: _D, months: int) -> _D:
    """Move ``value`` by ``months`` Jalali months, keeping the time of day.

    The day of the month is clamped to the target month's length, so
    31 Shahrivar plus one month is 30 Mehr, and 30 Esfand of a leap year
    minus one year is 29 Esfand.
    """
    year, month, day = to_jalali(value)
    index = year * 12 + month - 1 + months
    year, month = divmod(index, 12)
    month += 1
    target = from_jalali(year, month, min(day, jalali_month_length(year, month)))
    return value + timedelta(days=(target - _as_date(value)).days)


def _as_date(value: date) -> date:
    return value.date() if isinstance(value, datetime) else value


_OFFSET_PATTERN = re.compile(
    r"^\s*(\d+)\s+(month|quarter|year)s?(?:\s+(ago|later))?\s*$", re.IGNORECASE
)


def jalali_offset_months(offset: str | None) -> int | None:
    """Signed number of months in a relative offset such as "1 year ago".

    Returns ``None`` for offsets that are not whole months, quarters or years
    ("7 days ago", "inherit", dates), which shift the same way in every
    calendar.
    """
    matched = _OFFSET_PATTERN.match(offset or "")
    if not matched:
        return None
    months = (
        int(matched[1]) * {"month": 1, "quarter": 3, "year": 12}[matched[2].lower()]
    )
    return -months if (matched[3] or "").lower() == "ago" else months


def jalali_bucket_key(value: date, unit: str) -> str:
    """Join key of the Jalali month, quarter or year containing ``value``."""
    year, month, _ = to_jalali(value)
    if unit == "month":
        return f"{year}-{month:02d}"
    if unit == "quarter":
        return f"{year}-Q{(month - 1) // 3 + 1}"
    return str(year)
