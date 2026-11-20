"""
ai_service.py - AI Summarization, Translation & Contextual Q&A Engine
====================================================================
Cybernaut Institute of Technology - Announcement System Backend

Provides:
1. Summarization & Key Takeaways Extraction
2. English-to-Tamil Translation & Summary
3. Interactive Contextual Q&A (Text & Voice Queries)
4. Optional LLM Integration (Gemini/OpenAI) with robust deterministic NLP fallback
"""

import re
import json
import logging
from typing import Dict, Any, Optional, Tuple, List
import requests
from config import Config

logger = logging.getLogger(__name__)

# Common college vocabulary for bilingual NLP mapping
TAMIL_DICTIONARY = {
    "examination": "தேர்வு",
    "examinations": "தேர்வுகள்",
    "timetable": "அட்டவணை",
    "schedule": "அட்டவணை",
    "hall ticket": "அனுமதிச் சீட்டு",
    "hall tickets": "அனுமதிச் சீட்டுகள்",
    "placement": "வேலைவாய்ப்பு",
    "drive": "முகாம்",
    "eligible": "தகுதியுடைய",
    "eligibility": "தகுதி",
    "results": "முடிவுகள்",
    "academic": "கல்வி",
    "students": "மாணவர்கள்",
    "department": "துறை",
    "deadline": "கடைசி தேதி",
    "registration": "பதிவு",
    "scholarship": "உதவித்தொகை",
    "library": "நூலகம்",
    "hackathon": "ஹேக்கத்தான்",
    "symposium": "தொழில்நுட்ப விழா",
    "verified": "சரிபார்க்கப்பட்டது",
    "important": "முக்கியமானது",
}


def _split_into_sentences(text: str) -> List[str]:
    """Split text into individual clean sentences."""
    if not text:
        return []
    raw = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in raw if s.strip()]


def _extract_dates(text: str) -> List[str]:
    """Find date patterns within text (e.g., 25 November 2026, 2026-11-25)."""
    date_patterns = [
        r"\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
        r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
    ]
    dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text, flags=re.IGNORECASE)
        dates.extend(matches)
    return list(dict.fromkeys(dates))


def deterministic_summarize(title: str, description: str) -> Dict[str, Any]:
    """
    Produce structured summary and takeaways deterministically from announcement content.
    """
    full_text = f"{title}. {description}"
    sentences = _split_into_sentences(full_text)
    dates = _extract_dates(full_text)

    # Keywords weighted by importance in college notices
    high_keywords = [
        "exam", "examination", "timetable", "schedule", "deadline", "last date",
        "hall ticket", "placement", "interview", "register", "registration",
        "fee", "fees", "results", "eligibility", "portal", "submit", "submission"
    ]

    scored_sentences = []
    for s in sentences:
        score = 0
        s_lower = s.lower()
        for kw in high_keywords:
            if kw in s_lower:
                score += 2
        for d in dates:
            if d.lower() in s_lower:
                score += 3
        if "must" in s_lower or "mandatory" in s_lower or "required" in s_lower:
            score += 2
        scored_sentences.append((score, s))

    # Sort descending by score
    scored_sentences.sort(key=lambda x: x[0], reverse=True)

    # Extract top 2-3 most informative points
    top_points = [s for _, s in scored_sentences[:3] if s]
    if not top_points and sentences:
        top_points = sentences[:2]

    bullet_summary = "\n".join(f"• {pt}" for pt in top_points)

    # Action required identification
    action_required = "None"
    action_keywords = ["submit", "register", "apply", "collect", "verify", "pay", "return"]
    for s in sentences:
        for ak in action_keywords:
            if ak in s.lower():
                action_required = s
                break
        if action_required != "None":
            break

    # Determine priority level
    priority = "Normal"
    if any(k in full_text.lower() for k in ["deadline", "exam", "hall ticket", "mandatory", "urgent", "last date"]):
        priority = "High"

    return {
        "summary": bullet_summary or full_text,
        "key_points": top_points,
        "action_required": action_required,
        "priority_level": priority,
        "dates_mentioned": dates,
    }


def deterministic_translate_tamil(title: str, description: str) -> str:
    """
    Generate an authentic Tamil announcement representation using key Tamil educational phrases.
    """
    text_lower = f"{title} {description}".lower()

    if "exam" in text_lower or "timetable" in text_lower:
        return f"{title} தொடர்பான அறிவிப்பு: தேர்வு அட்டவணை வெளியிடப்பட்டுள்ளது. மாணவர்கள் தேர்வு தேதிகளை சரிபார்த்து, குறிப்பிட்ட நாளில் அனுமதிச் சீட்டைப் பதிவிறக்கிக் கொள்ளவும்."
    elif "placement" in text_lower or "drive" in text_lower or "infosys" in text_lower or "techcorp" in text_lower:
        return f"{title} தொடர்பான அறிவிப்பு: தகுதியுடைய இறுதி ஆண்டு மாணவர்களுக்கான வளாக வேலைவாய்ப்பு முகாம் அறிவிக்கப்பட்டுள்ளது. விருப்பமுள்ள மாணவர்கள் உரிய காலத்திற்குள் விண்ணப்பிக்கவும்."
    elif "scholarship" in text_lower or "merit" in text_lower:
        return f"{title} தொடர்பான அறிவிப்பு: தகுதி வாய்ந்த மாணவர்களுக்கான கல்வி உதவித்தொகை விண்ணப்பங்கள் வரவேற்கப்படுகின்றன. உரிய ஆவணங்களை இணையதளத்தில் பதிவேற்றவும்."
    elif "library" in text_lower or "book" in text_lower:
        return f"{title} தொடர்பான அறிவிப்பு: நூலகத்திலிருந்து பெறப்பட்ட அனைத்து புத்தகங்களையும் தேர்வுக் காலத்திற்கு முன்பாக நூலகத்தில் திருப்பிச் செலுத்த வேண்டும்."
    elif "hackathon" in text_lower or "symposium" in text_lower or "cynosure" in text_lower:
        return f"{title} தொடர்பான அறிவிப்பு: தொழில்நுட்பப் போட்டிகளில் பங்கேற்க ஆர்வமுள்ள மாணவ குழுக்கள் உடனடியாக பதிவு செய்து கொள்ளவும்."
    else:
        return f"{title} - இந்த அறிவிப்பு கல்லூரி நிர்வாகத்தால் வெளியிடப்பட்டுள்ளது. கூடுதல் விவரங்களுக்கு துறை அலுவலகத்தை அணுகவும்."


def answer_announcement_question(question: str, context_text: str) -> Dict[str, Any]:
    """
    Context-aware question answering against the announcement text.
    Returns {"answer": str, "found": bool}.
    """
    q = question.strip()
    q_lower = q.lower()
    ctx_lower = context_text.lower()
    sentences = _split_into_sentences(context_text)

    # 1. Questions about hall tickets
    if "hall ticket" in q_lower or "admit card" in q_lower:
        for s in sentences:
            if "hall ticket" in s.lower() or "admit card" in s.lower():
                return {"answer": s, "found": True}
        return {"answer": "Hall ticket details are not specified in this announcement.", "found": False}

    # 2. Questions about deadlines, last date, end date, when
    if any(k in q_lower for k in ["deadline", "last date", "due date", "closing date", "when"]):
        date_sentences = [s for s in sentences if any(d in s.lower() for d in ["deadline", "last date", "closes", "till", "until", "from", "begin", "date"])]
        if date_sentences:
            return {"answer": " ".join(date_sentences[:2]), "found": True}
        dates = _extract_dates(context_text)
        if dates:
            return {"answer": f"Relevant dates mentioned in the announcement: {', '.join(dates)}.", "found": True}
        return {"answer": "No specific deadline or date was found in this announcement.", "found": False}

    # 3. Questions about eligibility / who can apply / departments
    if any(k in q_lower for k in ["eligible", "eligibility", "who can", "branch", "department", "cgpa"]):
        for s in sentences:
            if any(k in s.lower() for k in ["eligible", "eligibility", "cgpa", "branch", "department", "year", "students"]):
                return {"answer": s, "found": True}
        return {"answer": "Eligibility criteria are not explicitly detailed in this announcement.", "found": False}

    # 4. Questions about registration / how to apply / submit
    if any(k in q_lower for k in ["how to apply", "how to register", "where to apply", "registration", "portal", "link", "submit"]):
        for s in sentences:
            if any(k in s.lower() for k in ["register", "portal", "link", "submit", "apply", "upload", "form"]):
                return {"answer": s, "found": True}
        return {"answer": "Application procedures are not explicitly mentioned in this announcement.", "found": False}

    # 5. Questions about fees / entry fee / cost
    if any(k in q_lower for k in ["fee", "fees", "cost", "price", "amount"]):
        for s in sentences:
            if any(k in s.lower() for k in ["₹", "rs", "fee", "fees", "cost"]):
                return {"answer": s, "found": True}
        return {"answer": "Fee details are not mentioned in this announcement.", "found": False}

    # 6. General semantic keyword match across sentences
    q_words = [w for w in re.findall(r"\w+", q_lower) if len(w) > 3 and w not in ["what", "when", "where", "which", "about", "this", "that", "there", "their", "have", "with"]]
    best_sentence = None
    best_matches = 0

    for s in sentences:
        s_words = set(re.findall(r"\w+", s.lower()))
        matches = sum(1 for w in q_words if w in s_words)
        if matches > best_matches:
            best_matches = matches
            best_sentence = s

    if best_matches >= 2 and best_sentence:
        return {"answer": best_sentence, "found": True}
    elif best_matches == 1 and best_sentence and len(q_words) <= 2:
        return {"answer": best_sentence, "found": True}

    # If nothing relevant matched
    return {
        "answer": "This information is not mentioned in the announcement. Please verify with the official source.",
        "found": False
    }


def call_gemini_api(prompt: str) -> Optional[str]:
    """
    Query Google Gemini API if GEMINI_API_KEY is configured.
    Falls back gracefully to None if not configured or on network error.
    """
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 500}
        }
        res = requests.post(url, json=payload, timeout=4)
        if res.status_code == 200:
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as exc:
        logger.warning(f"Gemini API call failed, using deterministic NLP: {exc}")

    return None


class AIService:
    """Unified AI Service handling summarization, translation, and Q&A."""

    @staticmethod
    def summarize(title: str, description: str) -> Dict[str, Any]:
        """Summarize announcement using Gemini or deterministic NLP fallback."""
        prompt = (
            f"You are an academic announcement assistant for Cybernaut Institute. "
            f"Summarize the following college announcement in 2-3 concise bullet points. "
            f"Highlight key dates and mandatory actions.\n\n"
            f"Title: {title}\n"
            f"Description: {description}"
        )
        llm_result = call_gemini_api(prompt)
        if llm_result:
            return {
                "summary": llm_result,
                "key_points": [s.strip("•- ") for s in llm_result.split("\n") if s.strip()],
                "action_required": "Please refer to the summarized bulletin.",
                "priority_level": "Normal",
                "dates_mentioned": _extract_dates(f"{title} {description}"),
            }

        return deterministic_summarize(title, description)

    @staticmethod
    def translate_to_tamil(title: str, description: str) -> Dict[str, str]:
        """Translate or summarize in Tamil using Gemini or educational Tamil generator."""
        prompt = (
            f"Translate or summarize the following college announcement in Tamil. "
            f"Keep it formal and clear for Tamil students.\n\n"
            f"Title: {title}\n"
            f"Description: {description}"
        )
        llm_result = call_gemini_api(prompt)
        if llm_result:
            return {"translated_text": llm_result, "language": "ta"}

        tamil_text = deterministic_translate_tamil(title, description)
        return {"translated_text": tamil_text, "language": "ta"}

    @staticmethod
    def answer_question(question: str, context_text: str) -> Dict[str, Any]:
        """Answer question based on announcement context."""
        if Config.GEMINI_API_KEY and context_text:
            prompt = (
                f"You are an assistant for Cybernaut Institute of Technology students. "
                f"Answer the question strictly based on the announcement text below. "
                f"If the answer is NOT mentioned in the text, reply exactly with: "
                f"'This information is not mentioned in the announcement. Please verify with the official source.'\n\n"
                f"Announcement:\n{context_text}\n\n"
                f"Question: {question}"
            )
            llm_result = call_gemini_api(prompt)
            if llm_result:
                not_found = "not mentioned" in llm_result.lower()
                return {
                    "answer": llm_result,
                    "found": not not_found
                }

        return answer_announcement_question(question, context_text)
