"""
Space Missions analysis — required functions for programmatic grading.

Function names use camelCase exactly as specified in the case-study PDF.
Floats are rounded to 2 decimal places exactly as specified.

Run `python space_missions.py` to execute the built-in self-test.
"""

from __future__ import annotations

import csv
import os
from collections import Counter
from datetime import datetime
from typing import Optional

CSV_FILENAME = "space_missions.csv"

# ---------------------------------------------------------------------------
# Data loading (cached so repeated function calls don't re-read the file)
# ---------------------------------------------------------------------------

_CACHE: Optional[list[dict]] = None


def _loadData(path: Optional[str] = None) -> list[dict]:
    """Load the CSV once and cache it. Each row is a dict keyed by column name."""
    global _CACHE
    if _CACHE is not None and path is None:
        return _CACHE

    csv_path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), CSV_FILENAME)
    if not os.path.exists(csv_path):
        # fall back to current working directory
        csv_path = CSV_FILENAME

    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Normalise whitespace on key fields
    for r in rows:
        for k in ("Company", "Mission", "Rocket", "MissionStatus", "Date"):
            if k in r and r[k] is not None:
                r[k] = r[k].strip()

    if path is None:
        _CACHE = rows
    return rows


def _parseDate(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Required functions
# ---------------------------------------------------------------------------

def getMissionCountByCompany(companyName: str) -> int:
    """Total number of missions for a given company."""
    if not isinstance(companyName, str) or not companyName:
        return 0
    rows = _loadData()
    return sum(1 for r in rows if r["Company"] == companyName)


def getSuccessRate(companyName: str) -> float:
    """Success rate (%) for a given company, rounded to 2 decimal places.
    Only rows with MissionStatus == 'Success' count as successful.
    Returns 0.0 if the company has no missions.
    """
    if not isinstance(companyName, str) or not companyName:
        return 0.0
    rows = _loadData()
    company_rows = [r for r in rows if r["Company"] == companyName]
    if not company_rows:
        return 0.0
    successes = sum(1 for r in company_rows if r["MissionStatus"] == "Success")
    return round(successes / len(company_rows) * 100, 2)


def getMissionsByDateRange(startDate: str, endDate: str) -> list:
    """List of mission names launched between startDate and endDate (inclusive),
    sorted chronologically.
    """
    if not isinstance(startDate, str) or not isinstance(endDate, str):
        return []
    start = _parseDate(startDate)
    end = _parseDate(endDate)
    if start is None or end is None or start > end:
        return []

    rows = _loadData()
    matched = []
    for r in rows:
        d = _parseDate(r["Date"])
        if d is not None and start <= d <= end:
            matched.append((d, r["Mission"]))
    matched.sort(key=lambda x: x[0])
    return [m for _, m in matched]


def getTopCompaniesByMissionCount(n: int) -> list:
    """Top N companies by mission count.
    Sorted descending by count, then alphabetically by company name on ties.
    Returns list of (companyName, missionCount) tuples.
    """
    if not isinstance(n, int) or n <= 0:
        return []
    rows = _loadData()
    counts = Counter(r["Company"] for r in rows if r["Company"])
    # Sort: count desc, name asc
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return ranked[:n]


def getMissionStatusCount() -> dict:
    """Count of missions for each status."""
    rows = _loadData()
    counts: dict[str, int] = {
        "Success": 0,
        "Failure": 0,
        "Partial Failure": 0,
        "Prelaunch Failure": 0,
    }
    for r in rows:
        status = r["MissionStatus"]
        if status in counts:
            counts[status] += 1
        elif status:
            counts[status] = counts.get(status, 0) + 1
    return counts


def getMissionsByYear(year: int) -> int:
    """Total number of missions launched in a specific year."""
    if not isinstance(year, int):
        return 0
    rows = _loadData()
    count = 0
    for r in rows:
        d = _parseDate(r["Date"])
        if d is not None and d.year == year:
            count += 1
    return count


def getMostUsedRocket() -> str:
    """Name of the rocket used the most times.
    Ties broken alphabetically (first one alphabetically wins).
    """
    rows = _loadData()
    counts = Counter(r["Rocket"] for r in rows if r["Rocket"])
    if not counts:
        return ""
    max_count = max(counts.values())
    top = sorted([name for name, c in counts.items() if c == max_count])
    return top[0]


def getAverageMissionsPerYear(startYear: int, endYear: int) -> float:
    """Average missions per year over [startYear, endYear] inclusive.
    Rounded to 2 decimal places.
    """
    if not isinstance(startYear, int) or not isinstance(endYear, int):
        return 0.0
    if startYear > endYear:
        return 0.0
    rows = _loadData()
    total = 0
    for r in rows:
        d = _parseDate(r["Date"])
        if d is not None and startYear <= d.year <= endYear:
            total += 1
    span = endYear - startYear + 1
    return round(total / span, 2)


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("getMissionCountByCompany('NASA'):", getMissionCountByCompany("NASA"))
    print("getMissionCountByCompany('SpaceX'):", getMissionCountByCompany("SpaceX"))
    print("getMissionCountByCompany(''):", getMissionCountByCompany(""))
    print("getSuccessRate('NASA'):", getSuccessRate("NASA"))
    print("getSuccessRate('SpaceX'):", getSuccessRate("SpaceX"))
    print("getSuccessRate('NoSuchCo'):", getSuccessRate("NoSuchCo"))
    print("getMissionsByDateRange('1957-10-01', '1957-12-31'):",
          getMissionsByDateRange("1957-10-01", "1957-12-31"))
    print("getTopCompaniesByMissionCount(3):", getTopCompaniesByMissionCount(3))
    print("getMissionStatusCount():", getMissionStatusCount())
    print("getMissionsByYear(2020):", getMissionsByYear(2020))
    print("getMostUsedRocket():", getMostUsedRocket())
    print("getAverageMissionsPerYear(2010, 2020):", getAverageMissionsPerYear(2010, 2020))
