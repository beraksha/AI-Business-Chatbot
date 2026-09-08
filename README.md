# PlannerChat — AI Business Planning Assistant

An embeddable chat widget that lets users ask natural-language questions
about a dataset, with **role-based access control** enforced server-side —
different logged-in users see different scoped slices of the same data.

This is a from-scratch portfolio project built to demonstrate the pattern
behind embeddable, multi-tenant AI assistants. **All data is synthetic**
(randomly generated in `backend/data.py`); there is no real company or
customer data anywhere in this repo.

## Architecture

```
Host page (demo/index.html)
        │  loads via <script data-role="...">
        ▼
Embeddable widget (frontend/widget.js)
        │  POST /api/chat { message, role }
        ▼
Backend API (backend/app.py — Flask)
        │  scopes rows by role (RBAC)
        │  answers via rules, or Claude if ANTHROPIC_API_KEY is set
        ▼
In-memory synthetic dataset (backend/data.py)
```

**Key ideas demonstrated:**
- An embeddable widget script that any page can drop in with a single
  `<script>` tag, configured via `data-*` attributes.
- Server-side RBAC: the widget just passes along a `role`; the backend
  decides what data that role is allowed to see. The frontend can't leak
  data it never receives.
- A pluggable answer engine — falls back to simple rule-based analytics
  with zero configuration, or calls Claude for richer natural-language
  answers if you provide an API key.
- A standalone demo "parent site" (`demo/index.html`) that simulates
  different logged-in users without needing a real production environment.

## Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

This starts the API at `http://localhost:5000`.

Optional — enable real LLM-generated answers instead of the rule-based
fallback:

```bash
export ANTHROPIC_API_KEY=your_key_here   # macOS/Linux
set ANTHROPIC_API_KEY=your_key_here      # Windows (cmd)
```

### 2. Demo page

Open `demo/index.html` directly in your browser (no build step needed).
Pick a role from the dropdown, then click the chat bubble in the
bottom-right corner and try:

- "What are the top products?"
- "Show me revenue by region"
- "What are the most recent orders?"

Switch the role dropdown and ask the same questions again — regional
managers only see their own region's data; admins see everything.

## Project structure

```
backend/
  app.py            Flask API: RBAC scoping + answer engine
  data.py            Synthetic dataset generator
  requirements.txt
frontend/
  widget.js          Embeddable vanilla-JS chat widget
demo/
  index.html         Mock "parent site" with a role switcher
```

## Notes on scope

This is intentionally a simplified version of a more complex, production
pattern (which in a real deployment would typically also involve signed
tokens instead of a plain role string, a proper database instead of an
in-memory list, and stricter CORS rules). It's meant to demonstrate the
architecture and RBAC pattern clearly, not to be a production-ready
template as-is.
