/* Real playback starts, not button clicks. No browser-local leaderboard counters. */
(() => {
  const measurementId = 'G-JD1JHF86H1'; // Verified in https://philemon.com.tw/ source.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false });
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.append(script);
  }
  let session = null;
  window.PhilemonAnalytics = {
    select(song) { session = { song, counted: false }; },
    count(audio) {
      if (!session || session.counted || audio.paused || audio.seeking || audio.currentTime <= 0 || audio.readyState < 2) return;
      const song = session.song;
      const expected = (song.s || song.id) + '.mp3';
      if (!audio.currentSrc.endsWith('/' + expected)) return;
      session.counted = true;
      gtag('event', 'music_preview', {
        send_to: measurementId,
        song_id: song.id,
        song_title: song.n,
        composer: song.c,
        audio_id: song.s || song.id,
        interface_language: document.documentElement.lang,
        transport_type: 'beacon'
      });
    }
  };
})();
