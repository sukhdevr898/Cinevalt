import youtubedl from 'youtube-dl-exec';
async function run() {
  try {
    const output = await youtubedl('https://www.youtube.com/playlist?list=PL4cUxeGkcC9gUgr39Q_yD6v-bSyCbKPVM', {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true
    });
    console.log("YT Output items:", output.entries.length);
  } catch(e) {
    console.error(e);
  }
}
run();
