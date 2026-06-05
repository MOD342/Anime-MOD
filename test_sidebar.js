import * as cheerio from 'cheerio';

async function testSidebar() {
  const response = await fetch('https://animelek.top/anime/sousou-no-frieren-2nd-season/');
  const html = await response.text();
  const $ = cheerio.load(html);
  $('a').each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes('Tensei')) {
      console.log('found in:', $(el).parents().map((i, el) => $(el).attr('class')).get().slice(0, 5));
    }
  });
}
testSidebar();
