import * as cheerio from 'cheerio';

async function testEpisodes() {
  const response = await fetch('https://animelek.top/anime/sousou-no-frieren-2nd-season/');
  const html = await response.text();
  const $ = cheerio.load(html);
  const eps = [];
  $('.media-episodes a, .episodes-lists a').each((i, el) => {
    eps.push({
      text: $(el).text().trim(),
      href: $(el).attr('href'),
      parentClasses: $(el).parents().map((i, p) => $(p).attr('class')).get().slice(0,3)
    });
  });
  console.log(eps);
}
testEpisodes();
