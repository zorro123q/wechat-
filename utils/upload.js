function getFileSize(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath,
      success: (res) => resolve(Number(res && res.size) || 0),
      fail: reject
    });
  });
}

function compressImage(filePath, quality) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: filePath,
      quality,
      success: (res) => resolve(res && res.tempFilePath ? res.tempFilePath : filePath),
      fail: reject
    });
  });
}

async function compressToLimit(filePath, maxBytes) {
  let current = filePath;
  const qualities = [80, 65, 50, 35, 25];
  for (let i = 0; i < qualities.length; i += 1) {
    const size = await getFileSize(current);
    if (size > 0 && size <= maxBytes) return { filePath: current, size };
    const next = await compressImage(current, qualities[i]);
    current = next || current;
  }
  const size = await getFileSize(current);
  return { filePath: current, size };
}

function ensureImageUnderLimit(filePath, maxBytes = 2 * 1024 * 1024) {
  return compressToLimit(filePath, maxBytes).then(res => {
    if (res.size > maxBytes) {
      const err = new Error('FILE_TOO_LARGE');
      err.code = 'FILE_TOO_LARGE';
      err.size = res.size;
      err.maxBytes = maxBytes;
      throw err;
    }
    return res.filePath;
  });
}

module.exports = {
  ensureImageUnderLimit
};

