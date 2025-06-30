const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cheerio = require('cheerio');

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const headers = {
  accept: 'application/json, text/javascript, */*; q=0.01',
  'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
  origin: 'https://y2save.com',
  referer: 'https://y2save.com/id',
  'user-agent': 'Postify/1.0.0',
  'x-requested-with': 'XMLHttpRequest',
};

const availableQualities = {
  mp4: ['360P', '480P', '720p', '1080P'],
  mp3: ['128kbps'],
};

const y2save = {
  baseURL: 'https://y2save.com',
  headers,
  fmt: ['mp4', 'mp3'],
  qualities: availableQualities,

  geToken: async function () {
    const res = await client.get(this.baseURL + '/id', {
      headers: this.headers,
    });
    const $ = cheerio.load(res.data);
    return $('meta[name="csrf-token"]').attr('content');
  },

  search: async function (query) {
    const token = await this.geToken();
    const res = await client.post(
      this.baseURL + '/search',
      `_token=${token}&query=${encodeURIComponent(query)}`,
      { headers: this.headers }
    );
    return res.data;
  },

  convert: async function (videoId, key) {
    const token = await this.geToken();
    const res = await client.post(
      this.baseURL + '/searchConvert',
      `_token=${token}&vid=${videoId}&key=${encodeURIComponent(key)}`,
      { headers: this.headers }
    );
    return res.data;
  },

  getAvailableQualities: function (searchResult) {
    return {
      mp4: searchResult.data.convert_links.video.map(v => v.quality),
      mp3: searchResult.data.convert_links.audio.map(a => a.quality),
    };
  },

  main: async function (query, format = 'mp4', quality = '480P') {
    if (!this.fmt.includes(format)) {
      throw new Error(`Invalid format! Use: ${this.fmt.join(', ')}`);
    }

    const searchResult = await this.search(query);

    if (searchResult.status !== 'ok') {
      throw new Error('Search failed!');
    }

    const available = this.getAvailableQualities(searchResult);

    const items = format === 'mp4'
      ? searchResult.data.convert_links.video
      : searchResult.data.convert_links.audio;

    const selected = items.find(item => item.quality === quality);

    if (!selected) {
      throw new Error(
        `Quality ${quality} not available for format ${format}. Try: ${available[format].join(', ')}`
      );
    }

    const conversion = await this.convert(searchResult.data.vid, selected.key);

    if (conversion.status !== 'ok') {
      throw new Error('Conversion failed!');
    }

    await client.get(conversion.dlink, {
      headers: this.headers,
      jar,
      withCredentials: true,
      maxRedirects: 5,
    });

    return conversion.dlink;
  },
};

module.exports = { y2save };
