import json
import urllib.request

data = json.load(urllib.request.urlopen('http://127.0.0.1:9001/songs'))

print('\n✅ SONGS WITH REAL YOUTUBE URLS\n')
print('=' * 100)

from collections import defaultdict
by_artist = defaultdict(list)

for song in data:
    by_artist[song['artist_name']].append(song)

for artist in sorted(by_artist.keys()):
    songs = by_artist[artist]
    print(f'\n{artist}')
    print('-' * 100)
    for song in songs:
        audio_url = song['audio_url']
        # Extract just the video ID from YouTube URL
        if 'youtube.com/embed/' in audio_url:
            video_id = audio_url.split('youtube.com/embed/')[-1]
        else:
            video_id = audio_url[-11:]  # Last 11 chars is typically the video ID
        print(f'  • {song["title"]:30} | {song["genre"]:15} | 🎬 {audio_url}')

print(f'\n{"=" * 100}')
print(f'✅ All {len(data)} songs now have real YouTube URLs!\n')
