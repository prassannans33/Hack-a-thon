from google import genai  # Gemini API
import os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@app.route("/generate", methods=["POST"])
def generate_portfolio():
    data = request.json
    user_input = data.get("query", "")
    language = data.get("language", "English")
    risk = data.get("risk", None)

    # Check if it's a general question (no capital or investment terms)
    if not any(word in user_input.lower() for word in ["capital", "invest", "fund", "portfolio", "risk"]):
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=f"Answer this finance question in a friendly tone and in {language}: {user_input}"
        )
        return jsonify({"response": response.text})

    # Otherwise, handle as portfolio generation
    portfolio = generate_portfolio_plan(user_input, risk, language)
    return jsonify({"response": portfolio})