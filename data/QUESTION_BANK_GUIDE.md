# Question Bank Guide

The app supports `.json`, `.txt`, `.tsv`, and `.csv` — just upload or add to `data/manifest.json`.

---

## Format — JSON (`.json`)

```json
{
  "metadata": { "source": "My Bank", "total_questions": 100 },
  "questions": [
    {
      "lesson": "Surgery::GIT::Appendix",
      "question": "Which is the most common cause of acute appendicitis?",
      "options": [
        "Fecalith obstruction",
        "Lymphoid hyperplasia",
        "Carcinoid tumor",
        "Foreign body"
      ],
      "answerKey": "A",
      "answerText": "Fecalith obstruction",
      "explanation": "Fecalith (hardened stool) is the most common cause, especially in adults.",
      "tags": ["surgery::appendix", "diagnosis"]
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lesson` | string | Yes | Grouping label — use `::` for hierarchy |
| `question` | string | Yes | The question text |
| `options` | string[] | Yes | Answer choices — first = A, second = B, etc. |
| `answerKey` | string | Yes | Correct letter: `"A"` through `"E"` |
| `answerText` | string | — | Text of the correct answer |
| `explanation` | string | — | Why the answer is correct |
| `tags` | string[] | — | Topic tags; first tag shown as display tag |

---

## Adding a New Bank

Drop the file in `data/` and add it to `data/manifest.json`:

```json
{
  "files": [
    "data/Critical-Thinking.txt",
    "data/GIT-Enhanced.json",
    "data/MyNewBank.json"
  ]
}
```

The app reads this on startup — no code changes needed.
Or just **Upload** directly from the app header.

---

## Lesson Naming

Use `::` as a hierarchy separator for better grouping:
```