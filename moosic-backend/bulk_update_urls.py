import json
import urllib.request

# YouTube video IDs mapping
youtube_urls = {
    "Welcome to New York": "https://www.youtube.com/embed/8HW-_VIH3Aw",
    "Shake It Off": "https://www.youtube.com/embed/nfWlot6h_mw",
    "Out of the Woods": "https://www.youtube.com/embed/JUAgVmbqIe0",
    "Shape of You": "https://www.youtube.com/embed/JGwWNGJdvx8",
    "Perfect": "https://www.youtube.com/embed/2takcxucVgk",
    "Castle on the Hill": "https://www.youtube.com/embed/K35bpnksXrQ",
    "Hello": "https://www.youtube.com/embed/YQHsXMglC9A",
    "Someone Like You": "https://www.youtube.com/embed/hHUbLv4ThOo",
    "Rolling in the Deep": "https://www.youtube.com/embed/rvDxyXQ5yP4",
    "Levitating": "https://www.youtube.com/embed/TUVcZfQe-Kw",
    "Don't Start Now": "https://www.youtube.com/embed/oygrmJFVQkc",
    "Physical": "https://www.youtube.com/embed/gNlKcRqqoHM",
    "Tum Hi Ho": "https://www.youtube.com/embed/zHlVP5WYfEU",
    "Chahun Main Ya Naa": "https://www.youtube.com/embed/IYp3X_8N8C0",
    "Kala Chashma": "https://www.youtube.com/embed/wapXwEjOMfU",
    "Genda Phool": "https://www.youtube.com/embed/p-nHDqU7g4E",
    "Hips Don't Lie": "https://www.youtube.com/embed/DUT5rEU6pqM",
    "Waka Waka": "https://www.youtube.com/embed/HaHZRPIavto",
    "Chandelier": "https://www.youtube.com/embed/2vjPBrBU-TM",
    "Elastic Heart": "https://www.youtube.com/embed/KWZGAExj-es",
    "Blinding Lights": "https://www.youtube.com/embed/4NRXx6U8ABQ",
    "Save Your Tears": "https://www.youtube.com/embed/XXYlFuWEwEY",
}

# Get all songs
response = urllib.request.urlopen('http://127.0.0.1:7777/admin/songs/bulk-audio-urls')
songs = json.loads(response.read())

print(f'\n📝 Updating {len(songs)} songs with YouTube URLs...\n')

for song in songs:
    title = song['title']
    song_id = song['id']
    
    if title in youtube_urls:
        new_url = youtube_urls[title]
        
        # Update via API
        req = urllib.request.Request(
            f'http://127.0.0.1:7777/admin/songs/{song_id}/audio-url?audio_url={urllib.parse.quote(new_url)}',
            method='PUT'
        )
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print(f'✅ {title:30} → YouTube')
    else:
        print(f'⏭️  {title:30} → Kept existing URL')

print(f'\n✅ All songs updated!\n')
