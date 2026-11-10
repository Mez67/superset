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
Time grains in the Jalali (Solar Hijri / Persian) calendar.

Jalali month, quarter and year boundaries do not line up with Gregorian ones,
so they cannot be expressed with ``DATE_TRUNC``. Instead, each grain is
computed with integer arithmetic from the number of days since 1970-01-01:

1. ``n = days_since_epoch + JALALI_EPOCH_DAY_NUMBER`` gives a continuous day
   count anchored on the 33-year Jalali leap cycle.
2. ``r = (n mod 12053) mod 1461`` locates the day inside its 4-year cycle,
   and ``doy = r > 365 ? (r - 1) mod 365 : r`` is the zero-based day of the
   Jalali year.
3. The first six Jalali months have 31 days and the next five have 30, so
   the offset from the start of the month, quarter or year follows from
   ``doy`` alone, and the grain value is the date minus that offset.

The arithmetic matches the official calendar (as computed by ``jalaali-js``)
for every day from 1925 to 2125. Engines opt in by setting
``BaseEngineSpec.jalali_dialect``; the grains are offered when
``CALENDAR = "jalali"``.
"""

from __future__ import annotations

from dataclasses import dataclass

from superset.utils.backports import StrEnum


class JalaliTimeGrain(StrEnum):
    """Jalali calendar time grains.

    Kept apart from ``TimeGrain`` because they have no pandas frequency or
    fixed bucket width: features keyed on those (forecasting, partition
    mirroring) treat them as unsupported grains.
    """

    MONTH = "JALALI_MONTH"
    QUARTER = "JALALI_QUARTER"
    YEAR = "JALALI_YEAR"


# Day number of 1970-01-01 in the continuous day count used by the algorithm.
JALALI_EPOCH_DAY_NUMBER = 1075195


@dataclass(frozen=True)
class JalaliDialect:
    """SQL building blocks an engine needs for Jalali time grains.

    :param epoch_days: integer number of days from 1970-01-01 to the calendar
        date of ``{col}``.
    :param minus_days: the calendar date of ``{col}`` minus ``{days}`` days.
    :param mod: integer remainder of ``{a}`` divided by ``{b}``.
    """

    epoch_days: str
    minus_days: str
    mod: str = "(({a}) % ({b}))"


def jalali_time_grain_expressions(dialect: JalaliDialect) -> dict[str | None, str]:
    """Build ``{col}`` templates for the Jalali month, quarter and year grains."""

    def mod(a: str, b: int) -> str:
        return dialect.mod.format(a=a, b=b)

    def minus_days(days: str) -> str:
        return dialect.minus_days.replace("{days}", days)

    day_number = f"({dialect.epoch_days} + {JALALI_EPOCH_DAY_NUMBER})"
    cycle_day = mod(mod(day_number, 12053), 1461)
    day_of_year = (
        f"(CASE WHEN {cycle_day} > 365 "
        f"THEN {mod(f'{cycle_day} - 1', 365)} ELSE {cycle_day} END)"
    )
    day_of_month = (
        f"(CASE WHEN {day_of_year} < 186 THEN {mod(day_of_year, 31)} "
        f"ELSE {mod(f'{day_of_year} - 186', 30)} END)"
    )
    day_of_quarter = (
        f"({day_of_year} - CASE WHEN {day_of_year} < 93 THEN 0 "
        f"WHEN {day_of_year} < 186 THEN 93 "
        f"WHEN {day_of_year} < 276 THEN 186 ELSE 276 END)"
    )
    return {
        JalaliTimeGrain.MONTH: minus_days(day_of_month),
        JalaliTimeGrain.QUARTER: minus_days(day_of_quarter),
        JalaliTimeGrain.YEAR: minus_days(day_of_year),
    }
