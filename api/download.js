const { y2save } = require('../y2save');

module.exports = async (req, res) => {
  const { url, format = 'mp4', quality = '480P' } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing required parameter: url' });
  }

  try {
    const downloadUrl = await y2save.main(url, format, quality);
    return res.status(200).json({
      status: 'success',
      format,
      quality,
      download: downloadUrl,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Something went wrong!',
    });
  }
};
