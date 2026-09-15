import * as mb from 'mediabunny';

mb.Logging.level = mb.LogLevel.Silent;

async function run() {
  const url = "http://bad.domain.invalid/video.mp4";
  const input = new mb.Input({
    source: new mb.UrlSource(url, {
      getRetryDelay: (attempt) => {
        // No retries
        return null;
      }
    }),
    formats: mb.ALL_FORMATS,
  });

  const duration = await input.computeDuration();
  console.log("Duration:", duration);
}
run().catch(console.error);
