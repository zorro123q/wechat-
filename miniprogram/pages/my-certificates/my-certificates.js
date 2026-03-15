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
      const formattedCerts = res.data.map(cert => ({
        ...cert,
        formattedDate: formatTime(cert.issueDate, 'YYYY-MM-DD')
      }));
      this.setData({
        certificates: formattedCerts,
        loading: false
      });
    }).catch(err => {
      console.error('加载证书失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  onPullDownRefresh() {
    this.loadCertificates().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
