"""
Scraper engine: robots.txt check, fetch, parse announcements + attachment links.
Never guesses dates: published_date is None unless a date is explicitly on the page.
"""
import hashlib
import re
from datetime import datetime
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

import config

DOC_EXT = (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx")
MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec"

# Order matters. dd/mm/yyyy is used (Indian convention), not mm/dd/yyyy.
DATE_PATTERNS = [
    (re.compile(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b"), "dmy_num"),
    (re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"), "ymd"),
    (re.compile(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?[\s\-]+({MONTHS})[a-z]*\.?,?[\s\-]+(\d{{4}})\b", re.I), "d_mon_y"),
    (re.compile(rf"\b({MONTHS})[a-z]*\.?\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s+(\d{{4}})\b", re.I), "mon_d_y"),
]


def _clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def content_hash(title, description):
    """SHA-256 of normalised title + description (used for change detection)."""
    raw = f"{_clean(title).lower()}\n{_clean(description).lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def extract_date(text):
    """Return 'YYYY-MM-DD' only if an explicit valid date is in the text, else None."""
    text = text or ""
    for pattern, kind in DATE_PATTERNS:
        m = pattern.search(text)
        if not m:
            continue
        a, b, c = m.groups()
        try:
            if kind == "dmy_num":
                d = datetime(int(c), int(b), int(a))
            elif kind == "ymd":
                d = datetime(int(a), int(b), int(c))
            elif kind == "d_mon_y":
                d = datetime.strptime(f"{int(a)} {b[:3].title()} {c}", "%d %b %Y")
            else:
                d = datetime.strptime(f"{int(b)} {a[:3].title()} {c}", "%d %b %Y")
            return d.strftime("%Y-%m-%d")
        except ValueError:
            continue  # invalid date such as 31/02/2025 -> ignore, never guess
    return None


def _session():
    s = requests.Session()
    s.headers.update({"User-Agent": config.USER_AGENT})
    return s


def allowed_by_robots(url, session):
    """True only if robots.txt permits our user agent. Conservative on errors."""
    p = urlparse(url)
    robots_url = f"{p.scheme}://{p.netloc}/robots.txt"
    try:
        r = session.get(robots_url, timeout=config.REQUEST_TIMEOUT)
    except requests.RequestException:
        return False
    if r.status_code == 404:
        return True  # no robots.txt = no restrictions stated
    if r.status_code != 200:
        return False
    rp = RobotFileParser()
    rp.parse(r.text.splitlines())
    return rp.can_fetch(config.USER_AGENT, url)


def parse_listing(html, page_url, source):
    """Turn a listing page into a list of announcement dicts (standard JSON format)."""
    soup = BeautifulSoup(html, "lxml")
    sel = source.get("item_selector") or "table tr, ul li, article, .notice, .announcement"
    allow_no_link = bool(source.get("allow_no_link"))
    items = []

    for node in soup.select(sel):
        anchors = [a for a in node.find_all("a", href=True)
                   if not a["href"].lower().startswith(("javascript:", "mailto:", "#"))]
        if not anchors and not allow_no_link:
            continue

        # Attachments = links to documents
        attachments = []
        for a in anchors:
            href = urljoin(page_url, a["href"])
            if urlparse(href).path.lower().endswith(DOC_EXT):
                name = href.rsplit("/", 1)[-1]
                attachments.append({
                    "file_name": (_clean(a.get_text()) or name)[:255],
                    "file_url": href,
                    "file_type": name.rsplit(".", 1)[-1].lower(),
                })

        # Main link: configured selector, else first non-document link, else first link
        link = None
        if anchors:
            link_el = node.select_one(source["link_selector"]) if source.get("link_selector") else None
            if link_el is None or not link_el.get("href"):
                non_docs = [a for a in anchors if not urlparse(a["href"]).path.lower().endswith(DOC_EXT)]
                link_el = (non_docs or anchors)[0]
            link = urljoin(page_url, link_el["href"])

        title_el = node.select_one(source["title_selector"]) if source.get("title_selector") else None
        if title_el is not None:
            title = _clean(title_el.get_text())
        elif anchors:
            title = _clean(link_el.get_text())
        else:
            title = ""
        if len(title) < 8:  # skip header rows, icons, "Read more", nav items
            continue

        full_text = _clean(node.get_text(" "))
        date_el = node.select_one(source["date_selector"]) if source.get("date_selector") else None
        date_text = _clean(date_el.get_text(" ")) if date_el else ""
        published = extract_date(date_text if date_el else full_text)

        desc = full_text.replace(title, "", 1)
        if date_text:
            desc = desc.replace(date_text, "", 1)
        desc = _clean(desc)
        desc = desc[:2000] if len(desc) >= 15 else None  # None if nothing meaningful

        items.append({
            "title": title[:500],
            "description": desc,
            "category": None,       # classified later by Member 5 (AI)
            "department": source.get("department"),
            "published_date": published,
            "deadline": None,       # not extracted here (never guessed)
            "source_url": link,
            "pdf_url": attachments[0]["file_url"] if attachments else None,
            "attachments": attachments,
            "content_hash": content_hash(title, desc),
            "source_type": "live_scraped",
            "verification_status": "Needs Review",
        })

    # source_url must be unique per announcement. If a notice has no link, or many
    # notices share one link (e.g. a generic results page), use the listing page URL
    # plus a stable fragment built from date + title.
    counts = {}
    for it in items:
        counts[it["source_url"]] = counts.get(it["source_url"], 0) + 1
    final, seen = [], set()
    for it in items:
        if it["source_url"] is None or counts[it["source_url"]] > 1:
            key = f"{it['published_date']}|{it['title']}".lower().encode("utf-8")
            it["source_url"] = f"{page_url}#{hashlib.sha1(key).hexdigest()[:16]}"
        if it["source_url"] in seen:
            continue
        seen.add(it["source_url"])
        final.append(it)

    limit = source.get("max_items")
    return final[:limit] if limit else final


def scrape_source(source):
    """Fetch + parse one source. Raises on failure; returns list of items."""
    s = _session()
    url = source["url"]
    if not allowed_by_robots(url, s):
        raise PermissionError(f"robots.txt does not permit scraping {url}")
    r = s.get(url, timeout=config.REQUEST_TIMEOUT)
    r.raise_for_status()
    r.encoding = r.apparent_encoding if not r.encoding or r.encoding.lower() == "iso-8859-1" else r.encoding
    return parse_listing(r.text, url, source)
