import json
import urllib.request

data = json.load(urllib.request.urlopen('http://127.0.0.1:9000/songs'))

print('\n🎵 COMPLETE SONG CATALOG\n')
print('=' * 80)

# Group by artist
from collections import defaultdict
by_artist = defaultdict(list)

for song in data:
    by_artist[song['artist_name']].append(song)

for artist in sorted(by_artist.keys()):
    songs = by_artist[artist]
    print(f'\n{artist}')
    print('-' * 80)
    for song in songs:
        print(f'  • {song["title"]:30} | {song["genre"]:15} | {song["language"]:10}')

print(f'\n{"=" * 80}')
print(f'Total: {len(data)} songs across {len(by_artist)} artists\n')
