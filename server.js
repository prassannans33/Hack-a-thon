// backend/index.js
import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

function buildPrompt({ capital, monthlyInvestment, riskLevel, preferences, query, language }) {
  // Normalize
  const cap = capital ? `₹${capital}` : "N/A";
  const sip = monthlyInvestment ? `₹${monthlyInvestment} / month` : "N/A";
  const prefs = Array.isArray(preferences) && preferences.length ? preferences.join(", ") : "Not specified";
  const risk = (riskLevel || "medium").toString().toLowerCase();

  // Ask Gemini to return strictly JSON. Include language param so responses can be returned in that language.
  const langNote = language && language !== "en" ? `Return final text in the user's language: ${language}.` : "Return final text in English.";

  return `
You are an Indian financial advisor AI that returns only JSON. The user input:

- Capital: ${cap}
- Monthly SIP: ${sip}
- Risk appetite: ${risk}
- Preferences: ${prefs}
- Query: ${query || "Portfolio recommendation"}
${langNote}

TASK:
1) If the user query is a general question about investing (detect by phrasing like "What is", "How does", "Explain", or short question), return JSON with field "answer" (short explanatory text) and "language" field.
2) Otherwise produce a DETAILED portfolio recommendation in JSON only.

JSON OUTPUT SPECIFICATION:
Return a single JSON object (no extra commentary). Use these fields EXACTLY:

{
  "type": "portfolio" | "general",
  "language": "<language code>",
  "riskLevel": "<Low|Medium|High>",
  "riskScore": <number between 0-10>,
  "timeHorizonYears": <integer, suggested>,
  "capital": "<string, e.g. ₹100000>",
  "monthlyInvestment": "<string>",
  "allocation": {
    "equity_percent": <number>,
    "debt_percent": <number>,
    "mutualfunds_percent": <number>,
    "bonds_percent": <number>,
    "gold_percent": <number>,
    "cash_percent": <number>
  },
  "projectedAnnualReturnEstimate": "<e.g. 9-12%>",
  "projectedNotes": "<short text about assumptions used to compute projections>",
  "recommendedMutualFunds": [
    {"name":"<fund name>", "type":"<Large cap / Flexi cap / Debt / Hybrid>", "tickerOrInfo":"<AMFI code or brief note>", "why":"<one-line reason>"}
  ],
  "recommendedStocks": [
    {"name":"<company name>", "exchange":"NSE/BSE", "why":"<one-line reason>"}
  ],
  "recommendedBanksForDebt": [
    {"name":"<bank name>", "product":"<FD / Savings / Corporate FD>", "why":"<one-line reason>"}
  ],
  "recommendedBonds": [
    {"name":"<bond name>", "type":"<Govt / PSU>", "why":"<one-line reason>"}
  ],
  "risksAndMitigations": ["<bullet points>"],
  "actionPlan": ["<step-by-step actionable items>"],
  "confidence": "<low|medium|high>"
}

IMPORTANT:
- Keep numbers realistic.
- If user asked a general finance question, set "type": "general" and return {"type":"general", "language":..., "answer":"..."}.
- If user asked for language translation, return text in requested language.
- Do NOT include any additional text outside the JSON object.
`;
}

async function callGemini(prompt) {
  if (!GEMINI_KEY) throw new Error("No Gemini API key provided");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const resp = await axios.post(url, body, { timeout: 20000 });
  // Extract the text result (guarded)
  const text = resp?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

// Fallback local heuristic (simple generator) when no Gemini key present
function localFallback(body) {
  const { capital, monthlyInvestment, riskLevel, preferences, query, language } = body;
  // simple mapping
  const risk = (riskLevel || "medium").toLowerCase();
  let allocation;
  let projected;
  let confidence = "medium";

  if (query && (/what|how|explain|define|difference|meaning/i).test(query)) {
    // return a short general answer
    const answers = {
      en: "SIP (Systematic Investment Plan) lets you invest a fixed amount regularly into mutual funds. It helps rupee cost averaging and disciplined investing.",
      hi: "SIP (सिस्टमेटिक इन्वेस्टमेंट प्लान) आपको नियमित रूप से म्यूचुअल फंडों में एक निश्चित राशि निवेश करने देता है। यह डिसिप्लिन और रु। वैरिएशन में मदद करता है।",
      ta: "SIP என்பது மியூச்சுவல் ஃபண்டுகளில் மாத்திரையாக தொகையை முதலீடு செய்வதற்கு உதவுகிறது; இது உட்பட்ட செலவைக் குறைக்கிறது.",
      te: "SIP అనేది మీచ్యువల్ ఫండ్స్‌లో న్లకం చేయడానికి సహాయపడుతుంది. ఇది ఖర్చు సరిపడే విధంగా ఉంటుంది.",
      kn: "SIP ಮ್ಯೂಚುಯಲ್ ಫಂಡ್ಗಳಲ್ಲಿ ನಿಯತ ಪ್ರಮಾಣದ ಹೂಡಿಕೆಯನ್ನು ಸಹಾಯ ಮಾಡುತ್ತದೆ; ಇದು ಅವಸರದ ನಿರ್ವಹಣೆಗೆ ಸಹಕಾರಿ.",
      ml: "SIP മ്യൂച്വൽ ഫണ്ടുകളിൽ സ്ഥിരത്തവണ നിക്ഷേപം ചെയ്യാൻ സഹായിക്കുന്നു; ഇത് റൂಪಿ കോസ്റ്റ് ശരാശരി എന്നിവയുടെ ഗുണങ്ങള്‍ നല്‍കുന്നു."
    };
    return { type: "general", language: language || "en", answer: answers[language] || answers.en };
  }

  if (risk === "high") {
    allocation = { equity_percent: 65, debt_percent: 10, mutualfunds_percent: 15, bonds_percent: 0, gold_percent: 5, cash_percent: 5 };
    projected = "12-15%";
    confidence = "medium";
  } else if (risk === "low") {
    allocation = { equity_percent: 20, debt_percent: 50, mutualfunds_percent: 20, bonds_percent: 5, gold_percent: 3, cash_percent: 2 };
    projected = "6-8%";
    confidence = "medium";
  } else {
    allocation = { equity_percent: 45, debt_percent: 30, mutualfunds_percent: 15, bonds_percent: 5, gold_percent: 3, cash_percent: 2 };
    projected = "8-11%";
    confidence = "medium";
  }

  const funds = [
    { name: "SBI Bluechip Fund", type: "Large cap", tickerOrInfo: "SBI Bluechip", why: "Large-cap, steady performance" },
    { name: "Parag Parikh Flexi Cap Fund", type: "Flexi cap", tickerOrInfo: "PPFLEXI", why: "Diversified across caps" },
    { name: "Axis Long Term Equity Fund", type: "ELSS / Equity", tickerOrInfo: "AXISLT", why: "Tax-efficient and growth oriented" }
  ];

  const stocks = [
    { name: "Infosys", exchange: "NSE", why: "Strong IT exporter with stable cash flows" },
    { name: "HDFC Bank", exchange: "NSE", why: "Leading private sector bank" },
    { name: "Reliance Industries", exchange: "NSE", why: "Diversified business & energy/retail growth" }
  ];

  const banks = [
    { name: "State Bank of India", product: "FD", why: "Largest PSU bank; stable returns" },
    { name: "HDFC Bank", product: "Fixed deposit", why: "Good track record" }
  ];

  return {
    type: "portfolio",
    language: language || "en",
    riskLevel: risk,
    riskScore: risk === "high" ? 8 : risk === "low" ? 3 : 5,
    timeHorizonYears: 5,
    capital: capital ? `₹${capital}` : "N/A",
    monthlyInvestment: monthlyInvestment ? `₹${monthlyInvestment}` : "N/A",
    allocation,
    projectedAnnualReturnEstimate: projected,
    projectedNotes: "Projections based on historical ranges and not guaranteed. Assumes diversified equity returns and stable debt yields.",
    recommendedMutualFunds: funds,
    recommendedStocks: stocks,
    recommendedBanksForDebt: banks,
    recommendedBonds: [{ name: "RBI Sovereign Gold Bond / Government Bonds", type: "Government", why: "Low credit risk" }],
    risksAndMitigations: ["Market volatility — diversify", "Maintain emergency cash — 3-6 months", "Regular SIPs for rupee-cost averaging"],
    actionPlan: [
      "Open a demat and mutual fund folio",
      "Start SIPs for selected mutual funds",
      "Allocate to FDs / bonds as per debt allocation",
      "Review quarterly and rebalance annually"
    ],
    confidence
  };
}

app.post("/api/portfolio", async (req, res) => {
  try {
    const { capital, monthlyInvestment, riskLevel, preferences, query, language } = req.body || {};

    // Simple validation
    const body = { capital, monthlyInvestment, riskLevel, preferences, query, language: language || "en" };

    // If Gemini key exists, call Gemini; otherwise fallback local
    if (!GEMINI_KEY) {
      console.warn("No GEMINI_API_KEY set — using local fallback generator.");
      const fallback = localFallback(body);
      return res.json(fallback);
    }

    // Build prompt
    const prompt = buildPrompt(body);

    // Call Gemini
    let rawText;
    try {
      rawText = await callGemini(prompt);
    } catch (e) {
      console.error("Gemini call failed:", e.message);
      // fallback if Gemini fails
      const fallback = localFallback(body);
      fallback.notice = "Gemini API failed; returned fallback response.";
      return res.json(fallback);
    }

    // Try to parse rawText as JSON. Gemini was instructed to return JSON only.
    // Sometimes LLMs wrap JSON in backticks or markdown, so we attempt to extract JSON substring.
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonText = rawText.substring(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonText);
        return res.json(parsed);
      } catch (parseErr) {
        console.warn("Failed to parse Gemini JSON; returning raw text in 'raw' field.", parseErr.message);
        return res.json({ type: "error", message: "Failed to parse Gemini output as JSON", raw: rawText });
      }
    } else {
      // If no JSON found, return raw text
      return res.json({ type: "error", message: "No JSON found in Gemini response", raw: rawText });
    }

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
