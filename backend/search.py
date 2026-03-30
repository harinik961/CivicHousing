from sqlalchemy import func, desc
from models import db, Housing, Community, Transportation

def search_model(model, query, highlight_field, page=1, per_page=12):
  if not query or query.strip() == "":
    return [], 0

  plain_query = func.plainto_tsquery('english', query)
  phrase_query = func.phraseto_tsquery('english', query)

  # Ranking
  rank_plain = func.ts_rank(model.__ts_vector__, plain_query)
  rank_phrase = func.ts_rank(model.__ts_vector__, phrase_query)

  # Multi-word matches hold more relevance
  total_rank = (rank_phrase * 2.0 + rank_plain).label("rank")

  # Highlighting
  headline = func.ts_headline(
    'english',
    getattr(model, highlight_field),
    plain_query,
    'StartSel=<mark>, StopSel=</mark>'
  ).label("highlight")

  base_query = (
    db.session.query(model, total_rank, headline)
    .filter(model.__ts_vector__.op('@@')(plain_query))
    .order_by(desc("rank"))
  )

  total = base_query.count()

  results = (
    base_query
    .limit(per_page)
    .offset((page - 1) * per_page)
    .all()
  )

  return results, total

def search_housing(query, page=1, per_page=12):
  results, total = search_model(
    Housing,
    query,
    highlight_field="project_name",
    page=page,
    per_page=per_page
  )

  return [
    {
      "data": housing.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for housing, rank, highlight in results
  ], total

def search_communities(query, page=1, per_page=12):
  results, total = search_model(
    Community,
    query,
    highlight_field="county",
    page=page,
    per_page=per_page
  )

  return [
    {
      "data": community.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for community, rank, highlight in results
  ], total

def search_transportation(query, page=1, per_page=12):
  results, total = search_model(
    Transportation,
    query,
    highlight_field="stop_name",
    page=page,
    per_page=per_page
  )

  return [
    {
      "data": t.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for t, rank, highlight in results
  ], total

def global_search(query, page=1, per_page=20):
  results = []

  for item, rank, highlight in search_model(Housing, query, "project_name")[0]:
    results.append(("housing", item, rank, highlight))

  for item, rank, highlight in search_model(Community, query, "county")[0]:
    results.append(("community", item, rank, highlight))

  for item, rank, highlight in search_model(Transportation, query, "stop_name")[0]:
    results.append(("transportation", item, rank, highlight))

  # Sort globally
  results.sort(key=lambda x: x[2], reverse=True)

  # Pagination
  total = len(results)
  start = (page - 1) * per_page
  end = start + per_page

  paginated = results[start:end]

  return [
    {
      "type": t,
      "data": obj.to_dict(),
      "highlight": highlight,
      "rank": rank
    }
    for t, obj, rank, highlight in paginated
  ], total