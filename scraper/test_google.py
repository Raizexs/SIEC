"""Dump raw HTML from Google Shopping to see structure"""
import urllib.request

url = "https://www.google.com/search?tbm=shop&q=Cemento+Portland+25+kg&hl=es&gl=cl"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
})
html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="replace")

# Save the first 5000 chars to see structure
print(html[:5000])
