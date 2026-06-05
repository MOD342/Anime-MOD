import * as cheerio from 'cheerio';

async function testStory(animeId) {
  try {
    const response = await fetch(`https://animelek.top/anime/${animeId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('anime-story wrapper html:', $('.anime-story').parent().html());
    $('*').each((i, el) => {
        if ($(el).text().includes('الموسم الثاني')) {
             console.log('Found in element:', el.name, 'classes:', $(el).attr('class'));
        }
    });
    
  } catch (e) {
    console.error(e);
  }
}

testStory('sousou-no-frieren-2nd-season');
