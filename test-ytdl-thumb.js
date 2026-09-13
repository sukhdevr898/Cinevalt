import youtubedl from 'youtube-dl-exec';
async function run() {
  try {
    const output = await youtubedl('https://www.youtube.com/user/YouTube/playlists', {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true
    });
    console.log(output.entries[0]);
  } catch(e) {
    console.error(e);
  }
}
run();
