import json
import urllib.request

data = json.load(urllib.request.urlopen('http://127.0.0.1:9000/songs'))

print('\n🔊 Audio URL Check\n')
for song in data[:5]:
    print(f'{song["title"]:30} → {song["audio_url"]}')

print('\n⚠️  These are PLACEHOLDER URLs - they won\'t actually play')
print('    They need to be replaced with real audio file URLs\n')
