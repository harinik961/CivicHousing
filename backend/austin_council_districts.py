"""
Austin City Council districts mapped to ZIP codes (majority assignment).

Each ZIP is assigned to a single district based on where the majority of its
physical area or residential population falls; many ZIPs cross district lines.
"""

from __future__ import annotations

from typing import Optional, Tuple

# District number -> ZIP codes (5-digit strings)
DISTRICT_ZIPS: dict[int, Tuple[str, ...]] = {
    1: ("78721", "78723", "78724", "78725", "78754"),
    2: ("78617", "78719", "78744", "78747"),
    3: ("78702", "78741", "78742"),
    4: ("78752", "78753", "78758"),
    5: ("78704", "78745", "78748"),
    6: ("78613", "78717", "78726", "78729", "78750"),
    7: ("78727", "78728", "78756", "78757"),
    8: ("78735", "78736", "78737", "78739", "78749"),
    9: ("78701", "78705", "78712", "78722", "78751"),
    10: ("78703", "78730", "78731", "78732", "78733", "78746", "78759"),
}


def zips_for_district(district: int) -> Optional[Tuple[str, ...]]:
    """Return ZIP codes for a council district, or None if district is not 1–10."""
    if district not in DISTRICT_ZIPS:
        return None
    return DISTRICT_ZIPS[district]
