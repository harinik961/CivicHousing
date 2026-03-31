from models import db, Housing, Community, Transportation
from sqlalchemy import cast, String, func, or_


def build_ts_query(query):
    # supports partial matching: bloom -> bloom:*
    terms = query.strip().split()
    ts_query = " & ".join([f"{term}:*" for term in terms])
    return func.to_tsquery('english', ts_query)


def search_model(model, query, highlight_field, page=1, per_page=12):
  if not query or query.strip() == "":
    return [], 0, 0

  ts_query = build_ts_query(query)

    # Ranking
  rank = func.ts_rank(model.ts_vector, ts_query).label("rank")

    # Highlight ONLY a clean field (no giant concatenation)
  highlight_column = getattr(model, highlight_field)

  headline = func.ts_headline(
    'english',
     cast(highlight_column, String),
     ts_query,
    'StartSel=<mark>, StopSel=</mark>'
    ).label("highlight")

    # Base query
  base_query = (
    db.session.query(model, rank, headline)
    .filter(model.ts_vector.op('@@')(ts_query))
    .order_by(rank.desc())
    )

    # Efficient count
  count_query = db.session.query(func.count()).filter(
      model.ts_vector.op('@@')(ts_query)
    )

  total = count_query.scalar()
  total_pages = (total + per_page - 1) // per_page

  results = (
    base_query
    .limit(per_page)
    .offset((page - 1) * per_page)
    .all()
  )

  return results, total, total_pages


# -------------------------------
# Model-specific search functions
# -------------------------------

def search_housing(query, page=1, per_page=12):
  results, total, total_pages = search_model(
    Housing, query, highlight_field="project_name", page=page, per_page=per_page
  )

  return [
    {
      "data": housing.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for housing, rank, highlight in results
  ], total, total_pages


def search_communities(query, page=1, per_page=12):
  results, total, total_pages = search_model(
    Community, query, highlight_field="county", page=page, per_page=per_page
  )

  return [
    {
      "data": community.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for community, rank, highlight in results
  ], total, total_pages


def search_transportation(query, page=1, per_page=12):
  results, total, total_pages = search_model(
    Transportation, query, highlight_field="stop_name", page=page, per_page=per_page
  )

  return [
    {
      "data": transportation.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for transportation, rank, highlight in results
  ], total, total_pages

# -------------------------------
# Global search
# -------------------------------
def global_search(query, page=1, per_page=20):
  # fetch all matches per model
  max_fetch = 1000  # arbitrary large number
  housing_results, _, _ = search_model(Housing, query, "project_name", page=1, per_page=max_fetch)
  community_results, _, _ = search_model(Community, query, "county", page=1, per_page=max_fetch)
  transport_results, _, _ = search_model(Transportation, query, "stop_name", page=1, per_page=max_fetch)

  combined = []
  for item, rank, highlight in housing_results:
    combined.append(("housing", item, rank, highlight))
  for item, rank, highlight in community_results:
    combined.append(("community", item, rank, highlight))
  for item, rank, highlight in transport_results:
    combined.append(("transportation", item, rank, highlight))

  combined.sort(key=lambda x: x[2], reverse=True)

  total = len(combined)
  total_pages = (total + per_page - 1) // per_page

  start = (page - 1) * per_page
  end = start + per_page
  paginated = combined[start:end]

  return [
    {
      "type": t,
      "data": obj.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for t, obj, rank, highlight in paginated
  ], total, total_pages