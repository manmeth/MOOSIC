import json
import urllib.request

data = json.load(urllib.request.urlopen('http://127.0.0.1:8500/songs'))

print('\n🎵 FINAL VERIFICATION - SONGS WITH YOUTUBE URLS\n')

# Sample a few songs and check their audio URLs
sample_songs = [
    "Welcome to New York",
    "Shape of You", 
    "Hello",
    "Levitating",
    "Tum Hi Ho",
    "Chandelier",
    "Blinding Lights"
]

for song in data:
    if song['title'] in sample_songs:
        url_type = "✅ YouTube" if "youtube.com/embed" in song['audio_url'] else "❌ Placeholder"
        print(f'{url_type} | {song["title"]:25} | {song["artist_name"]:20} | {song["audio_url"][:50]}...')

print(f'\nTotal songs ready: {len(data)}\n')
