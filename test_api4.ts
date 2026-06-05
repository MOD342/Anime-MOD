import { ScraperService } from './src/services/scraperService.js';

async function run() {
  const scraper = new ScraperService();
  const details = await scraper.getAnimeDetails('sousou-no-frieren-2nd-season');
  console.log(details.description);
}
run();
