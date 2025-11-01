# Dynamic Risk Score (DRS) Specification

## Objective
Compute a numeric **Dynamic Risk Score (DRS)** between **0 – 100** and a risk-type label for each investor.  
The score represents combined demographic, financial, and behavioral risk capacity.

---

## Formula

DRS_raw = 0.10age_score +
0.25financial_score +
0.20horizon_score +
0.30behavior_score +
0.15*goals_score

---


---

## Component Scoring

### 🧑 Age (10%)
| Age | Score |
|------|--------|
| < 25 | 80 |
| 25 – 35 | 70 |
| 36 – 45 | 50 |
| 46 – 60 | 30 |
| > 60 | 15 |

### 💰 Financial (25%)
| Capital + Income | Score |
|--------------------|--------|
| Very high (> ₹1 M + > ₹100 k pm) | 90 – 100 |
| High (₹500 k – 1 M + ₹60 k – 100 k pm) | 70 – 85 |
| Medium (₹200 k – 500 k + ₹30 k – 60 k pm) | 50 – 65 |
| Low (< ₹200 k + < ₹30 k pm) | 25 – 45 |

### ⏳ Horizon (20%)
| Longest goal (years) | Score |
|------------------------|--------|
| ≥ 20 | 90 |
| 10 – 19 | 75 |
| 5 – 9 | 55 |
| 3 – 4 | 35 |
| < 3 | 20 |

### 🧠 Behavior (30%)
Extract keywords + sentiment from `userText`.

Positive terms (add points): *calm, patient, disciplined, long-term, confident, growth*  
Negative terms (subtract points): *panic, scared, fear, lose, cautious, capital protection*

Sentiment → score map:
| Sentiment | Score |
|------------|--------|
| Strong Positive | 80 – 100 |
| Mild Positive | 60 – 80 |
| Neutral | 40 – 60 |
| Negative | 20 – 40 |
| Very Negative | 0 – 20 |

### 🎯 Goals (15%)
| Goal Type | Score |
|------------|--------|
| Long-term wealth / growth | 80 – 100 |
| Education / mid-term | 50 – 70 |
| Near-term purchases | 25 – 50 |
| Short-term safety goals | 10 – 25 |

---

## Label Mapping

| Range | Label |
|--------|--------|
| 0 – 24 | Very Conservative |
| 25 – 44 | Conservative |
| 45 – 64 | Balanced |
| 65 – 84 | Aggressive |
| 85 – 100 | Very Aggressive |

---

## Output Schema
```json
{
  "drs": 0,
  "label": "Balanced",
  "breakdown": {
    "age_score": 0,
    "financial_score": 0,
    "horizon_score": 0,
    "behavior_score": 0,
    "goals_score": 0
  },
  "explanation": "2-3 short sentences summarizing main drivers"
}
