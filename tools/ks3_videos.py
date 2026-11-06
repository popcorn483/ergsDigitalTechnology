"""Put a year's video list into its KS3 book: python3 tools/ks3_videos.py Y9 path/to/Y9-videos.json
The list is {"c01-p01": [{"title", "source", "url", "yt"?}, ...], ...}; it replaces each listed page's "videos".
Then run python3 tools/ks3_books.py to rebuild the book."""
import json, os, re, sys
yid, src = sys.argv[1], sys.argv[2]
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ks3', 'books', yid + '.json')
book = json.load(open(p, encoding='utf-8')); V = json.load(open(src, encoding='utf-8'))
n = 0
for c in book['chapters']:
    for pg in c['pages']:
        vs = []
        for v in V.get(pg['id'], []):
            url = str(v.get('url', ''))
            if not url.startswith('https://'): continue
            e = {'title': str(v.get('title', '')).strip(), 'source': str(v.get('source', '')).strip(), 'url': url}
            if v.get('yt') and re.fullmatch(r'[\w-]{6,20}', str(v['yt'])): e['yt'] = v['yt']
            vs.append(e)
        if pg['id'] in V: pg['videos'] = vs; n += len(vs)
json.dump(book, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{yid}: {n} videos added')
