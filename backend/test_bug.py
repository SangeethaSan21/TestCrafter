import os, json, random, string
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

bug_id = "BUG-" + "".join(random.choices(string.digits, k=4))
print("Bug ID:", bug_id)

prompt = """You are a senior QA engineer. Return ONLY this JSON, no extra text:
{
  "bug_id": "BUG-1234",
  "title": "Login fails on Chrome",
  "severity": "Major",
  "priority": "High",
  "environment": "Chrome 124, Windows 11",
  "description": "User sees blank screen after login.",
  "steps_to_reproduce": ["Open app", "Enter credentials", "Click login"],
  "actual_result": "Blank white screen shown",
  "expected_result": "Redirect to dashboard",
  "possible_root_cause": "Session token not set correctly",
  "suggested_fix": "Check auth middleware session handling",
  "labels": ["bug", "authentication", "chrome"]
}"""

resp = client.chat.completions.create(
    messages=[
        {"role": "system", "content": "Return only valid JSON. No markdown."},
        {"role": "user", "content": prompt}
    ],
    model="llama-3.3-70b-versatile",
    max_tokens=1000
)

raw = resp.choices[0].message.content.strip()
print("RAW RESPONSE:")
print(raw)

try:
    parsed = json.loads(raw)
    print("\nPARSED OK:", parsed["title"])
except Exception as e:
    print("\nPARSE ERROR:", e)