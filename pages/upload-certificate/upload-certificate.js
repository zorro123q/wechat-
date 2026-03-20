const api = require('../../utils/api.js');
const { formatTime } = require('../../utils/format.js');
const { ensureImageUnderLimit } = require('../../utils/upload.js');

Page({
  data: {
    uploads: [],
    loading: true,
    uploading: false
  },

  onLoad() {
    this.loadUploads();
  },

  onPullDownRefresh() {
    this.loadUploads().finally(() => wx.stopPullDownRefresh());
  },

  loadUploads() {
    this.setData({ loading: true });
    return api.getUploadedCertificates().then(res => {
      const rows = res.data || [];
      const formatted = rows.map(c => ({
        ...c,
        formattedDate: formatTime(c.createTime || c.issueDate, 'YYYY-MM-DD'),
        imageUrl: ''
      }));
      this.setData({ uploads: formatted, loading: false });

      const fileList = formatted.map(c => c.imageFileID).filter(Boolean);
      if (fileList.length === 0) return;
      return api.getTempFileURLCached(fileList).then(map => {
        const merged = (this.data.uploads || []).map(c => ({
          ...c,
          imageUrl: c.imageFileID ? (map[c.imageFileID] || '') : ''
        }));
        this.setData({ uploads: merged });
      });
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  chooseAndUpload() {
    const token = wx.getStorageSync('authToken');
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (this.data.uploading) return;

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res && res.tempFilePaths && res.tempFilePaths[0];
        if (!filePath) return;
        const userId = wx.getStorageSync('userId') || 'u';
        const ext = (filePath.split('.').pop() || 'jpg').toLowerCase();
        const cloudPath = `certificates/${userId}/${Date.now()}_${Math.floor(Math.random() * 100000)}.${ext}`;

        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中...' });
        ensureImageUnderLimit(filePath).then(safePath => {
          return wx.cloud.uploadFile({ cloudPath, filePath: safePath });
        }).then(r => {
          const fileID = r && r.fileID;
          if (!fileID) throw new Error('UPLOAD_FAILED');
          return api.uploadCertificate(fileID);
        }).then(() => {
          wx.hideLoading();
          wx.showToast({ title: '已上传' });
          return this.loadUploads();
        }).catch(err => {
          wx.hideLoading();
          if (err && err.code === 'FILE_TOO_LARGE') {
            wx.showToast({ title: '图片过大，请换一张小于2MB的图片', icon: 'none' });
            return;
          }
          wx.showToast({ title: '上传失败', icon: 'none' });
        }).finally(() => {
          this.setData({ uploading: false });
        });
      }
    });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    const urls = (this.data.uploads || []).map(c => c.imageUrl).filter(Boolean);
    wx.previewImage({ current: url, urls: urls.length ? urls : [url] });
  },

  deleteUpload(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    if (this.data.uploading) return;
    wx.showModal({
      title: '删除上传记录',
      content: '删除后不可恢复',
      success: (r) => {
        if (!r.confirm) return;
        this.setData({ uploading: true });
        wx.showLoading({ title: '删除中...' });
        api.deleteUploadedCertificate(id).then(() => {
          wx.hideLoading();
          wx.showToast({ title: '已删除' });
          return this.loadUploads();
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }).finally(() => {
          this.setData({ uploading: false });
        });
      }
    });
  }
});
