import os
import psycopg2
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = None

api_key = os.getenv("API_OPENROUTER_KEY")

if api_key:
    client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1"
    )


DB_URL = os.getenv("DATABASE_URL")

FORBIDDEN = ["insert", "update", "delete", "drop", "alter", "truncate", "create", "grant", "revoke"]


def is_safe_sql(sql: str) -> bool:
    sql_lower = sql.strip().lower()

    if not sql_lower.startswith("select"):
        return False

    if ";" in sql_lower[:-1]:
        return False

    for word in FORBIDDEN:
        if f" {word} " in f" {sql_lower} ":
            return False

    return True


def generate_sql(question: str) -> str:
    if not client:
        raise Exception("LLM not configured")

    prompt = f"""
You are a PostgreSQL SQL generator.

STRICT RULES:
- Return only one valid PostgreSQL SELECT query
- No explanations
- No markdown
- No multiple queries
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or CREATE
- Always use the exact table names and column names given below
- NEVER invent or assume columns that are not explicitly listed

TABLES:

communities(
    id,
    population,
    median_housing_price,
    crime_index,
    park_count,
    health_count,
    transit_score,
    zip_code,
    county,
    community_total_affordable_units,
    community_housing_count,
    transportation_count
)

housing(
    id,
    total_affordable_units,
    total_ada_units,
    walk_score,
    zip_code,
    unit_type,
    income_restriction_level,
    housing_tenure,
    council_district,
    project_name
)

transportation(
    id,
    stop_name,
    num_routes,
    transport_type,
    frequency,
    zip_code,
    wheelchair_accessible,
    service_days,
    travel_time_ut_minutes,
    travel_time_downtown_minutes,
    travel_time_domain_minutes
)

RELATIONSHIPS:
community_housing(community_id, housing_id)
community_transportation(community_id, transportation_id)
housing_transportation(housing_id, transportation_id)

RELATIONSHIP RULES:
- communities.id = community_housing.community_id
- housing.id = community_housing.housing_id

- communities.id = community_transportation.community_id
- transportation.id = community_transportation.transportation_id

- housing.id = housing_transportation.housing_id
- transportation.id = housing_transportation.transportation_id

IMPORTANT:
- NEVER assume foreign keys exist in main tables
- ALWAYS go through the relationship tables for joins

JOIN PATTERNS:
- communities ↔ housing:
  communities → community_housing → housing

- communities ↔ transportation:
  communities → community_transportation → transportation

- housing ↔ transportation:
  housing → housing_transportation → transportation

JOIN REQUIREMENT:
- If a question involves multiple entities (communities, housing, transportation),
  you MUST join through the appropriate relationship table
- Do NOT skip joins or shortcut relationships

IDENTIFIER RULES (VERY IMPORTANT):
- For communities → ALWAYS return zip_code as the identifier
- For housing → ALWAYS return project_name as the identifier
- For transportation → ALWAYS return stop_name as the identifier

SELECTION RULES:
- Do not return only a numeric/stat column by itself
- Always include the correct identifier with the metric
- The identifier MUST be the first column in SELECT

INTERPRETATION RULES:
- "best" or "highest rated transportation" → use communities.transit_score
- "most transportation" or "most routes" → use transportation.num_routes
- If asking about a community → prioritize communities table
- If asking about a housing project → prioritize housing table
- If asking about a stop → prioritize transportation table

EXAMPLES:

Question: Which community has the highest population?
SQL:
SELECT zip_code, population
FROM communities
ORDER BY population DESC
LIMIT 1;

Question: Which community has the highest transit score?
SQL:
SELECT zip_code, transit_score
FROM communities
ORDER BY transit_score DESC
LIMIT 1;

Question: Which housing project has the most ADA units?
SQL:
SELECT project_name, total_ada_units
FROM housing
ORDER BY total_ada_units DESC
LIMIT 1;

Question: Which transportation stop has the most routes?
SQL:
SELECT stop_name, num_routes
FROM transportation
ORDER BY num_routes DESC
LIMIT 1;

Question: What is the population for the community in zip code 78758?
SQL:
SELECT zip_code, population
FROM communities
WHERE zip_code = '78758'
LIMIT 1;

Now generate SQL for this question:

{question}
"""

    response = client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct",
        messages=[{"role": "user", "content": prompt}]
    )

    sql = response.choices[0].message.content.strip()
    sql = sql.replace("```sql", "").replace("```", "").strip()

    return sql


def run_query(sql: str):
    db_url = os.getenv("DATABASE_URL").replace("postgresql+psycopg2://", "postgresql://")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute(sql)
    columns = [desc[0] for desc in cur.description]
    rows = cur.fetchall()

    results = [dict(zip(columns, row)) for row in rows]

    cur.close()
    conn.close()

    return results


def generate_answer(question: str, results: list) -> str:
    if not client:
        return "Natural language responses are currently unavailable."

    results_text = "\n".join(
        f"- {list(row.values())}" for row in results[:10]
    ) if results else "No results found."

    prompt = f"""Given a user's question and database results, generate a clear natural English answer.

RULES:
- Be concise and do not invent missing data
- If the result includes both an identifier and a value, include both
- For communities, refer to the identifier as "zip code"
- For housing, refer to the identifier as "project name"
- For transportation, refer to the identifier as "stop name"
- If the result has more than 10 items, show only the top 10
- If it is a single result, return one clean sentence
- If there are multiple results, format as a numbered list ONLY — no intro sentence, no explanation

Numbered list format (EXACTLY like this):
1. Item One
2. Item Two
3. Item Three

Question:
{question}

Results:
{results_text}

Answer:"""

    response = client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct",
        messages=[
            {"role": "system", "content": "You are a helpful data assistant. Follow all formatting rules exactly. Return only the answer — no preamble, no explanation."},
            {"role": "user", "content": prompt}
        ]
    )

    answer = response.choices[0].message.content.strip()
    answer = answer.replace("```", "").strip()

    return answer
