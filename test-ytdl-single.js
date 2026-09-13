import youtubedl from 'youtube-dl-exec';
async function run() {
  try {
    const output = await youtubedl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      dumpSingleJson: true,
      noWarnings: true
    });
    console.log(output.title, output.duration);
  } catch(e) {
    console.error(e);
  }
}
run();
