// pages/my-certificates/my-certificates.js
const api = require('../../utils/api.js');
const { formatTime } = require('../../utils/format.js');

Page({
  data: {
    certificates: [],
    loading: true
  },

  onLoad(options) {
    this.loadCertificates();
  },

  loadCertificates() {
    this.setData({ loading: true });
    return api.getCertificates().then(res => {
      const rows = res.data || [];
      const formattedCerts = rows.map(cert => ({
        ...cert,
        formattedDate: formatTime(cert.issueDate || cert.createTime, 'YYYY-MM-DD')
      }));
      this.setData({
        certificates: formattedCerts,
        loading: false
      });

      const fileList = formattedCerts.map(c => c.imageFileID).filter(Boolean);
      if (fileList.length === 0) return;
      api.getTempFileURLCached(fileList).then(map => {
        const merged = (this.data.certificates || []).map(c => ({
          ...c,
          imageUrl: c.imageFileID ? (map[c.imageFileID] || '') : ''
        }));
        this.setData({ certificates: merged });
      }).catch(() => { });
    }).catch(err => {
      console.error('加载证书失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    const urls = (this.data.certificates || []).map(c => c.imageUrl).filter(Boolean);
    wx.previewImage({ current: url, urls: urls.length ? urls : [url] });
  },

  onPullDownRefresh() {
    this.loadCertificates().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
