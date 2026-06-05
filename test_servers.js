import * as cheerio from 'cheerio';

async function testServers(episodeId) {
  try {
    const response = await fetch(`https://animelek.top/episode/${episodeId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const servers = [];
    $('.servers-list li, .watch-servers li, .server-btn, a[data-embed]').each((_, el) => {
        const serverName = $(el).text().trim() || 'سيرفر';
        let serverUrl = $(el).attr('data-url') || $(el).attr('data-video-url') || $(el).attr('data-embed') || $(el).find('a').attr('href') || '';
        
        if (serverUrl) {
          if (serverUrl.includes('random=')) {
             serverUrl = serverUrl.split('random=')[1] || serverUrl;
          }
          servers.push({
            serverName: serverName.split('\n')[0].trim(),
            url: decodeURIComponent(serverUrl),
            type: serverUrl.includes('.mp4') ? 'direct' : 'iframe'
          });
        }
    });
    console.log('servers found:', servers.length);
    console.log(servers);
  } catch(e) { console.error(e); }
}

testServers('one-piece-1161-%D8%A7%D9%84%D8%AD%D9%84%D9%82%D8%A9');
