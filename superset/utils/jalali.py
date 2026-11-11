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

from datetime import date, timedelta

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
