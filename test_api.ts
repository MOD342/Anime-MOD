import { ScraperService } from './src/services/scraperService.js';

async function run() {
  const scraper = new ScraperService();
  const servers = await scraper.getEpisodeServers('one-piece-1161-%D8%A7%D9%84%D8%AD%D9%84%D9%82%D8%A9');
  console.log(servers);
}
run();
