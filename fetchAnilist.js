import fetch from 'node-fetch';
import fs from 'fs';

async function run() {
  const fetchGraphql = async (query, variables) => {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    return res.json();
  };

  const queryChars = `
    query($page: Int) {
      Page(page: $page, perPage: 50) {
        characters(sort: FAVOURITES_DESC) {
          id
          name { full }
          image { large }
        }
      }
    }
  `;

  const queryMedia = `
    query($page: Int) {
      Page(page: $page, perPage: 50) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          id
          title { romaji }
          bannerImage
        }
      }
    }
  `;

  let chars = [];
  let banners = [];

  // Fetch 5 pages of top characters (250 items)
  for (let page = 1; page <= 5; page++) {
    console.log('Fetching characters page', page);
    const charData = await fetchGraphql(queryChars, { page });
    const pageChars = charData.data?.Page?.characters || [];
    chars.push(...pageChars.map((c, i) => 
      `{ id: 'av_ani_${c.id}', name: '${(c.name?.full || '').replace(/'/g, "\\'")}', img: '${c.image?.large || ''}', type: 'avatar', price: ${1500 - (page * 50) - i}, desc: 'شخصية أنمي رائعة' }`
    ));
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }

  // Fetch 5 pages of top media (250 items) for banners
  for (let page = 1; page <= 5; page++) {
    console.log('Fetching media page', page);
    const mediaData = await fetchGraphql(queryMedia, { page });
    const pageMedia = mediaData.data?.Page?.media || [];
    banners.push(...pageMedia.filter(m => m.bannerImage).map((m, i) => 
      `{ id: 'ban_ani_${m.id}', name: '${(m.title?.romaji || '').replace(/'/g, "\\'")}', img: '${m.bannerImage || ''}', type: 'banner', price: ${2000 - (page * 50) - i}, desc: 'غلاف أنمي ملحمي' }`
    ));
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }

  fs.writeFileSync('src/data/anilistData.ts', 
    'export const anilistAvatars: any[] = [\n' + chars.join(',\n') + '\n];\n\n' +
    'export const anilistBanners: any[] = [\n' + banners.join(',\n') + '\n];'
  );
  console.log('Saved to src/data/anilistData.ts');
  console.log('Total characters:', chars.length);
  console.log('Total banners:', banners.length);
}

run();
