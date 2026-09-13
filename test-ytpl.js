import ytpl from 'ytpl';
async function run() {
  try {
    const playlist = await ytpl('PLwiyx1dc3P2JR9N8gQaQN_BCvlSlap7re');
    console.log(playlist.title, playlist.items.length);
  } catch(e) {
    console.error(e);
  }
}
run();
