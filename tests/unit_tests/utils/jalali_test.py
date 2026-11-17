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
from datetime import date, datetime, timedelta

import pandas as pd
import pytest

from superset.utils.jalali import (
    add_jalali_months,
    from_jalali,
    jalali_bucket_key,
    jalali_month_length,
    jalali_month_start,
    jalali_offset_months,
    to_jalali,
)


@pytest.mark.parametrize(
    "gregorian,jalali",
    [
        (date(2024, 3, 20), (1403, 1, 1)),
        (date(2025, 3, 20), (1403, 12, 30)),  # 1403 is a leap year
        (date(2025, 3, 21), (1404, 1, 1)),
        (date(2024, 11, 17), (1403, 8, 27)),
        (date(1979, 2, 11), (1357, 11, 22)),
    ],
)
def test_to_and_from_jalali(gregorian: date, jalali: tuple[int, int, int]) -> None:
    assert to_jalali(gregorian) == jalali
    assert from_jalali(*jalali) == gregorian


def test_round_trip_agrees_with_the_time_grains() -> None:
    day = date(1925, 3, 21)
    while day < date(2125, 3, 21):
        year, month, day_of_month = to_jalali(day)
        assert from_jalali(year, month, day_of_month) == day
        assert jalali_month_start(day) == from_jalali(year, month, 1)
        day += timedelta(days=1)


def test_month_lengths() -> None:
    assert [jalali_month_length(1403, m) for m in range(1, 13)] == [31] * 6 + [
        30
    ] * 5 + [30]
    assert jalali_month_length(1404, 12) == 29
    with pytest.raises(ValueError, match="Invalid Jalali date"):
        from_jalali(1404, 12, 30)


@pytest.mark.parametrize(
    "value,months,expected",
    [
        # 31 Shahrivar -> 30 Mehr (clamped)
        (datetime(2024, 9, 21, 15, 30), 1, datetime(2024, 10, 21, 15, 30)),
        # 30 Esfand 1403 -> 29 Esfand 1402
        (date(2025, 3, 20), -12, date(2024, 3, 19)),
        # 1 Azar -> 1 Aban, a pandas Timestamp stays one
        (pd.Timestamp("2024-11-21 10:00"), -1, pd.Timestamp("2024-10-22 10:00")),
    ],
)
def test_add_jalali_months(value: date, months: int, expected: date) -> None:
    result = add_jalali_months(value, months)
    assert result == expected
    assert type(result) is type(expected)


@pytest.mark.parametrize(
    "offset,months",
    [
        ("1 month ago", -1),
        ("2 quarters later", 6),
        ("3 Years Ago", -36),
        ("1 month", 1),
        ("7 days ago", None),
        ("inherit", None),
        ("2024-01-01", None),
        (None, None),
    ],
)
def test_jalali_offset_months(offset: str | None, months: int | None) -> None:
    assert jalali_offset_months(offset) == months


def test_jalali_bucket_key() -> None:
    day = date(2024, 11, 17)  # 27 Aban 1403
    assert jalali_bucket_key(day, "month") == "1403-08"
    assert jalali_bucket_key(day, "quarter") == "1403-Q3"
    assert jalali_bucket_key(day, "year") == "1403"
