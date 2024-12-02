function formatISOToJapaneseDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date string'); // 無効な日付の場合はエラーをスロー
  }

  const utcHours = date.getUTCHours();
  const japanHours = utcHours + 9;
  const adjustedDate = new Date(date);
  adjustedDate.setUTCHours(japanHours);

  const adjustedYear = adjustedDate.getUTCFullYear();
  const adjustedMonth = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
  const adjustedDay = String(adjustedDate.getUTCDate()).padStart(2, '0');
  const hours = String(japanHours % 24).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `${adjustedYear}/${adjustedMonth}/${adjustedDay} ${hours}:${minutes}`;
}


export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const referer = req.headers.referer;

      if (referer && referer.startsWith('http')) {
        const allowedSites = [
          'https://junshin-life.vercel.app/addons/content'
        ];
        const baseReferer = referer.split('?')[0];

        if (allowedSites.includes(baseReferer)) {
          res.setHeader('Access-Control-Allow-Methods', 'GET');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          const { id } = req.query;

          if (!id || typeof id !== 'string') {
            res.status(400).json({ error: 'ID Missing or Invalid' });
            return;
          }

          if (/^[as]\d{4}$/.test(id)) {
            const idNumber = id.substring(1);

            const url = `https://junshinlife.microcms.io/api/v1/addons/${id}`;
            const apiKey = 'Yp9DLQp66tQJgf4brEwj9uhtDhfhEUZDMmTU';

            try {
              const response = await fetch(url, { method: 'GET', headers: { "X-MICROCMS-API-KEY": apiKey } });

              if (response.ok) {
                const data = await response.json();
                const marketResponse = await fetch(
                  `https://www.minecraft.net/bin/minecraft/productmanagement.autosuggest.json?locale=ja-jp&term=${encodeURIComponent(data['name'] || '')}&term=${encodeURIComponent(data['japaneseName'] || '')}`
                );

                if (marketResponse.ok) {
                  let marketData = await marketResponse.json();
                  if(!marketData) marketData = [];

                  let responseData = {
                    title: `Addon #${idNumber}`,
                    name: data['name'],
                    japanesename: data['japaneseName'] ?? marketData[0].Title['ja-jp'] ?? null,
                    creator: data['creator'],
                    alt: data['alt'],
                    minecoin: data['minecoin'],
                    video: data['video']
                      ? `https://www.youtube.com/embed/${data['video']}`
                      : '/addons/img/nonvideo.png',
                    thumbnail: data['video']
                      ? `https://img.youtube.com/vi/${data['video']}/maxresdefault.jpg`
                      : '/addons/img/nonvideo.png',
                    comment: data['comment']
                      ? escapeHTML(data['comment'], [
                          'strong', 'a', 'p', 'span', 'ol', 'ul', 'li', 'u', 's', 'blockquote'
                        ])
                      : null,
                    updated: formatISOToJapaneseDate(data['updatedAt']),
                    editor: data['writer'] ? data['writer'].toString() : null,
                    market: {
                      id: marketData[0]?.id,
                      averating: marketData[0]?.AverageRating,
                      rating: marketData[0]?.TotalRatingsCount,
                      creator: marketData[0]?.DisplayProperties?.creatorName
                    }
                  };

                  res.status(200).json(responseData);
                } else {
                  res.status(500).json({ error: 'Failed to fetch market data' });
                }
              } else {
                switch (response.status) {
                  case 404:
                    res.status(404).json({ error: 'Not Found' });
                    break;
                  case 429:
                    res.status(429).json({ error: 'Too Many Requests' });
                    break;
                  default:
                    res.status(response.status).json({ error: `Unexpected Error: ${response.status}` });
                }
              }
            } catch (error) {
              res.status(500).json({ error: 'API Request Failed', status: error.message });
            }
          } else {
            res.status(400).json({ error: 'ID Format Error' });
          }
        } else {
          res.status(403).json({ error: 'Origin Forbidden' });
        }
      } else {
        res.status(400).json({ error: 'Referer Error' });
      }
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
