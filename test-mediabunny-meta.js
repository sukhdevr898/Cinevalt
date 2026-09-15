import { Input, ALL_FORMATS, UrlSource, FilePathSource } from 'mediabunny';

async function run() {
  const url = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  const input = new Input({
    source: new UrlSource(url),
    formats: ALL_FORMATS,
  });

  const duration = await input.computeDuration();
  console.log("Duration:", duration);
  
  const videoTrack = await input.getPrimaryVideoTrack();
  if (videoTrack) {
    const w = await videoTrack.getDisplayWidth();
    const h = await videoTrack.getDisplayHeight();
    const codec = await videoTrack.getCodec();
    console.log("Video:", w, h, codec);
  }
}
run().catch(console.error);
