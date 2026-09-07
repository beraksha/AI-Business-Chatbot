import os
from collections import defaultdict

from flask import Flask, request, jsonify
from flask_cors import CORS

from data import generate_dataset

app = Flask(__name__)
CORS(app)

DATASET = generate_dataset()


ROLES = {
    "admin": {"regions": None},  # None = no restriction, sees everything
    "manager_north": {"regions": ["North"]},
    "manager_south": {"regions": ["South"]},
    "manager_east": {"regions": ["East"]},
    "manager_west": {"regions": ["West"]},
}


def scoped_rows(role: str):
    """Return only the rows this role is allowed to see."""
    role_cfg = ROLES.get(role, {"regions": []})
    allowed_regions = role_cfg["regions"]

    if allowed_regions is None:
        return DATASET

    return [row for row in DATASET if row["region"] in allowed_regions]


def top_products(rows, n=5):
    totals = defaultdict(float)
    for r in rows:
        totals[r["product"]] += r["revenue"]
    return sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:n]


def revenue_by_region(rows):
    totals = defaultdict(float)
    for r in rows:
        totals[r["region"]] += r["revenue"]
    return sorted(totals.items(), key=lambda kv: kv[1], reverse=True)


def recent_orders(rows, n=5):
    return sorted(rows, key=lambda r: r["date"], reverse=True)[:n]


def markdown_table(headers, rows):
    head = "| " + " | ".join(headers) + " |"
    sep = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = "\n".join("| " + " | ".join(str(c) for c in row) + " |" for row in rows)
    return "\n".join([head, sep, body])


def rule_based_answer(question: str, rows: list) -> str:
    q = question.lower()

    if not rows:
        return "You don't have any data in your current scope for this dataset."

    if "top" in q and "product" in q:
        ranked = top_products(rows)
        table = markdown_table(
            ["Rank", "Product", "Revenue"],
            [[i + 1, name, f"${val:,.0f}"] for i, (name, val) in enumerate(ranked)],
        )
        return f"Here are the top products by revenue:\n\n{table}"

    if "region" in q:
        ranked = revenue_by_region(rows)
        table = markdown_table(
            ["Region", "Revenue"],
            [[name, f"${val:,.0f}"] for name, val in ranked],
        )
        return f"Here is revenue by region:\n\n{table}"

    if "recent" in q or "latest" in q:
        recents = recent_orders(rows)
        table = markdown_table(
            ["Date", "Region", "Product", "Revenue"],
            [
                [r["date"], r["region"], r["product"], f"${r['revenue']:,.0f}"]
                for r in recents
            ],
        )
        return f"Here are the most recent orders:\n\n{table}"

    total = sum(r["revenue"] for r in rows)
    return (
        f"I can see {len(rows)} order(s) totalling ${total:,.0f} in your scope. "
        "Try asking about 'top products', 'revenue by region', or 'recent orders'."
    )


def llm_answer(question: str, rows: list) -> str:
    """
    Calls Claude if ANTHROPIC_API_KEY is set in the environment. Falls back
    to the rule-based engine if the key is missing or the call fails, so
    the demo always works even without an API key.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return rule_based_answer(question, rows)

    try:
        import anthropic  # pip install anthropic

        client = anthropic.Anthropic(api_key=api_key)

        sample = rows[:15]
        prompt = (
            "You are a business analyst assistant. Answer using ONLY the sample "
            "data below. Be concise and use a Markdown table if useful.\n\n"
            f"SAMPLE DATA: {sample}\n\nQUESTION: {question}"
        )

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    except Exception as exc:  # noqa: BLE001
        print(f"[llm_answer] falling back to rule-based engine due to: {exc}")
        return rule_based_answer(question, rows)


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(force=True) or {}
    message = str(body.get("message", "")).strip()
    role = str(body.get("role", "")).strip()

    if role not in ROLES:
        return jsonify({"error": f"Unknown or missing role: {role}"}), 403

    if not message:
        return jsonify({"error": "Message is required"}), 400

    rows = scoped_rows(role)
    reply = llm_answer(message, rows)

    return jsonify(
        {
            "reply": reply,
            "role": role,
            "scopedRowCount": len(rows),
        }
    )


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "totalRows": len(DATASET)})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
