import { Download, Lock } from 'lucide-react';

export type DownloadedSong = { title: string; artist: string; date: string };

type DownloadsProps = {
  isPremium: boolean;
  downloadedSongs: DownloadedSong[];
};

export function Downloads({ isPremium, downloadedSongs }: DownloadsProps) {
  return (
    <section className="downloads-panel animate-rise-3" aria-labelledby="downloads-heading">
      <div className="panel-heading">
        <div>
          <h3 id="downloads-heading">Downloaded songs</h3>
          <p className="downloads-subtitle">Your offline listening shelf</p>
        </div>
        <span className={`downloads-access ${isPremium ? 'premium' : 'locked'}`}>
          {isPremium ? 'Premium' : 'Locked'}
        </span>
      </div>
      {!isPremium ? (
        <div className="downloads-empty downloads-empty--locked">
          <span className="downloads-empty-icon"><Lock size={18} /></span>
          <div>
            <strong>Offline listening is a Premium feature.</strong>
            <p>Upgrade to save songs from your mood room and listen without an internet connection.</p>
          </div>
        </div>
      ) : downloadedSongs.length === 0 ? (
        <div className="downloads-empty">
          <span className="downloads-empty-icon"><Download size={18} /></span>
          <div>
            <strong>Your download shelf is empty.</strong>
            <p>Download a song from the mood room and it will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="download-list" aria-label="Downloaded songs list">
          {downloadedSongs.map((song) => (
            <div key={`${song.title}-${song.date}`} className="download-row">
              <span className="download-row-icon"><Download size={15} /></span>
              <div className="download-row-copy">
                <strong>{song.title}</strong>
                <small>{song.artist}</small>
              </div>
              <time dateTime={song.date}>{song.date}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
