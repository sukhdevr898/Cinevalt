import youtubedl from 'youtube-dl-exec';
async function run() {
  try {
    const output = await youtubedl('https://www.youtube.com/user/YouTube/playlists', {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true
    });
    console.log("Length:", output.entries?.length);
    console.log("First:", output.entries?.[0]?.title, output.entries?.[0]?.id);
  } catch(e) {
    console.error(e);
  }
}
run();
