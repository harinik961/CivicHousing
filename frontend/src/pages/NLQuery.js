import { useState } from "react";
import "./NLQuery.css";

const API_BASE = "https://api.civichousing.me";
const LOCAL_API_BASE = "http://localhost:5000";

function NLQueryPage() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE}/api/nl-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="header-section">
        <h1 className="page-title">Ask the Data</h1>
        <p className="page-subtitle">
          Ask questions about housing, communities, and transportation.
        </p>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Which community has the highest population?"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button onClick={handleSubmit}>Ask</button>
        </div>

        {/* Example questions */}
        <div className="examples">
          <span onClick={() => setQuestion("Which community has the highest population?")}>
            Highest population
          </span>
          <span onClick={() => setQuestion("Show housing in zip code 78758")}>
            Housing in 78758
          </span>
          <span onClick={() => setQuestion("Which transportation has the most routes?")}>
            Most routes
          </span>
        </div>

        {loading && <p className="loading">Thinking...</p>}

       {response && (
        <div className="results-section">
            <div className="result-card">
            <h3>Answer</h3>
            <div className="answer-text">
                {response.answer.split("\n").map((line, i) => (
                <p key={i} style={{ margin: "2px 0" }}>{line}</p>
                ))}
            </div>
            </div>
            <div className="result-card">
              <h4>SQL Query</h4>
              <pre>{response.sql}</pre>
            </div>

            <div className="result-card">
              <h4>Results</h4>
              <pre>{JSON.stringify(response.results, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NLQueryPage;