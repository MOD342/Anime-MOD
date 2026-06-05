const https = require('https');
const data = JSON.stringify({
  query: `query {
    Page(page: 1, perPage: 50) {
      characters(sort: FAVOURITES_DESC) {
        id
        name { full }
        image { large }
      }
      media(sort: POPULARITY_DESC, type: ANIME) {
        id
        title { romaji }
        bannerImage
      }
    }
  }`
});

const req = https.request('https://graphql.anilist.co', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(body);
  });
});
req.write(data);
req.end();
