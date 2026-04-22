from models import db, Housing, Community, Transportation
from sqlalchemy import func, or_, and_, desc, asc, cast, String


# Build full-text queries


def build_queries(query):
    query = query.strip()

    phrase_query = func.phraseto_tsquery("english", query)
    plain_query = func.plainto_tsquery("english", query)

    terms = [term for term in query.split() if term.strip()]
    if terms:
        or_query = func.to_tsquery("english", " | ".join(terms))
    else:
        or_query = plain_query

    return phrase_query, plain_query, or_query


# Dynamic ILIKE fallback


def build_ilike_filter(model, query):
    filters = []

    for column in model.__table__.columns:
        col = getattr(model, column.name)

        # Cast everything to string so it works for ints, floats, etc.
        filters.append(cast(col, String).ilike(f"%{query}%"))

    return or_(*filters)


def build_search_filter(model, query):
    """Full-text + ILIKE filter used by list search. None if query is empty."""
    if not query or not str(query).strip():
        return None
    query = str(query).strip()
    phrase_q, plain_q, or_q = build_queries(query)
    return or_(
        model.ts_vector.op("@@")(phrase_q),
        model.ts_vector.op("@@")(plain_q),
        model.ts_vector.op("@@")(or_q),
        build_ilike_filter(model, query),
    )


def combined_filter(model, query, extra_filters=None):
    """Same predicate as search_model: search text + optional extra AND conditions."""
    sf = build_search_filter(model, query)
    extras = list(extra_filters or [])
    if sf is None:
        if not extras:
            return None
        return and_(*extras)
    if not extras:
        return sf
    return and_(sf, *extras)


# Core search logic


def search_model(
    model,
    query,
    page=1,
    per_page=12,
    extra_filters=None,
    sort_column=None,
    order="asc",
):
    if not query or query.strip() == "":
        return [], 0, 0

    phrase_q, plain_q, or_q = build_queries(query)

    # Ranking (ONLY full-text)
    rank = (
        func.ts_rank(model.ts_vector, phrase_q) * 3.0
        + func.ts_rank(model.ts_vector, plain_q) * 2.0
        + func.ts_rank(model.ts_vector, or_q)
    ).label("rank")

    combined = combined_filter(model, query, extra_filters)

    base_query = db.session.query(model, rank).filter(combined)

    if sort_column is not None:
        if order == "desc":
            base_query = base_query.order_by(desc(sort_column), desc(rank))
        else:
            base_query = base_query.order_by(asc(sort_column), desc(rank))
    else:
        base_query = base_query.order_by(desc(rank))

    # Efficient count
    total = db.session.query(func.count()).select_from(model).filter(combined).scalar()
    total_pages = (total + per_page - 1) // per_page

    results = base_query.limit(per_page).offset((page - 1) * per_page).all()

    return results, total, total_pages


# Model-specific search


def search_housing(
    query,
    page=1,
    per_page=12,
    extra_filters=None,
    sort_column=None,
    order="asc",
):
    results, total, total_pages = search_model(
        Housing,
        query,
        page,
        per_page,
        extra_filters=extra_filters,
        sort_column=sort_column,
        order=order,
    )

    return (
        [{"data": housing.to_dict(), "rank": rank} for housing, rank in results],
        total,
        total_pages,
    )


def search_communities(
    query,
    page=1,
    per_page=12,
    extra_filters=None,
    sort_column=None,
    order="asc",
):
    results, total, total_pages = search_model(
        Community,
        query,
        page,
        per_page,
        extra_filters=extra_filters,
        sort_column=sort_column,
        order=order,
    )

    return (
        [{"data": community.to_dict(), "rank": rank} for community, rank in results],
        total,
        total_pages,
    )


def search_transportation(
    query,
    page=1,
    per_page=12,
    extra_filters=None,
    sort_column=None,
    order="asc",
):
    results, total, total_pages = search_model(
        Transportation,
        query,
        page,
        per_page,
        extra_filters=extra_filters,
        sort_column=sort_column,
        order=order,
    )

    return (
        [
            {"data": transportation.to_dict(), "rank": rank}
            for transportation, rank in results
        ],
        total,
        total_pages,
    )


# Global search


def global_search(query, page=1, per_page=20):
    if not query or query.strip() == "":
        return [], 0, 0

    max_fetch = 200

    housing_results, _, _ = search_model(Housing, query, 1, max_fetch)
    community_results, _, _ = search_model(Community, query, 1, max_fetch)
    transport_results, _, _ = search_model(Transportation, query, 1, max_fetch)

    combined = []

    for item, rank in housing_results:
        combined.append(("housing", item, rank))

    for item, rank in community_results:
        combined.append(("community", item, rank))

    for item, rank in transport_results:
        combined.append(("transportation", item, rank))

    # Global ranking
    combined.sort(key=lambda x: x[2], reverse=True)

    total = len(combined)
    total_pages = (total + per_page - 1) // per_page

    start = (page - 1) * per_page
    end = start + per_page
    paginated = combined[start:end]

    return (
        [
            {"type": model_type, "data": obj.to_dict(), "rank": rank}
            for model_type, obj, rank in paginated
        ],
        total,
        total_pages,
    )
