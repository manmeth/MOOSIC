import json
import urllib.request
from collections import defaultdict

data = json.load(urllib.request.urlopen('http://127.0.0.1:7777/songs'))

print(f'\n{"=" * 90}')
print(f'✅ EXPANDED MUSIC CATALOG - 50+ SONGS')
print(f'{"=" * 90}\n')

# Group by artist
by_artist = defaultdict(list)
by_language = defaultdict(int)
by_genre = defaultdict(int)

for song in data:
    by_artist[song['artist_name']].append(song)
    by_language[song['language']] += 1
    by_genre[song['genre']] += 1

# Display stats
print(f'📊 CATALOG STATS')
print(f'{"-" * 90}')
print(f'Total Songs: {len(data)}')
print(f'Total Artists: {len(by_artist)}')
print(f'\n🌍 Languages:')
for lang in sorted(by_language.keys()):
    print(f'  • {lang}: {by_language[lang]} songs')

print(f'\n🎵 Genres:')
genre_list = sorted(by_genre.keys())
for i, genre in enumerate(genre_list):
    if i % 3 == 0:
        print()
    print(f'  • {genre}: {by_genre[genre]:2} songs', end='    ')

# Display artists and song count
print(f'\n\n{"=" * 90}')
print(f'🎤 ARTISTS & SONGS')
print(f'{"=" * 90}\n')
for artist in sorted(by_artist.keys()):
    songs = by_artist[artist]
    print(f'\n{artist:25} ({len(songs)} songs)')
    print(f'{"-" * 90}')
    for song in songs:
        lang_tag = f"[{song['language']}]"
        print(f'  • {song["title"]:35} - {song["genre"]:18} {lang_tag}')

print(f'\n{"=" * 90}')
print(f'✅ Backend ready with {len(data)} songs!\n')
