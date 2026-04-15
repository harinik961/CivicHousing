import os
import psycopg2
from flask import Blueprint, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

nl_query_bp = Blueprint("nl_query", __name__)

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

TABLES:

communities(
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

VERY IMPORTANT SELECTION RULES:
- Do not return only a numeric/stat column by itself
- Always include an identifying field together with the requested metric/value
- For communities, always include zip_code with the requested community metric
- For housing, always include project_name with the requested housing metric
- For transportation, always include stop_name with the requested transportation metric

EXAMPLES:

Question: Which community has the highest population?
SQL:
SELECT zip_code, population
FROM communities
ORDER BY population DESC
LIMIT 1;

Question: Which community has the highest crime index?
SQL:
SELECT zip_code, crime_index
FROM communities
ORDER BY crime_index DESC
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
        model="meta-llama/llama-3.1-8b-instruct",
        messages=[{"role": "user", "content": prompt}]
    )

    sql = response.choices[0].message.content.strip()
    sql = sql.replace("```sql", "").replace("```", "").strip()

    return sql


def run_query(sql: str):
    conn = psycopg2.connect(DB_URL)
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
        model="meta-llama/llama-3.1-8b-instruct",
        messages=[
            {"role": "system", "content": "You are a helpful data assistant. Follow all formatting rules exactly. Return only the answer — no preamble, no explanation."},
            {"role": "user", "content": prompt}
        ]
    )

    answer = response.choices[0].message.content.strip()
    answer = answer.replace("```", "").strip()

    return answer
