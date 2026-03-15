Page({
  data: {
    fileID: '',
    tempFileURL: '',
    imgSrc: '',
    loading: true,
    saving: false,
    errorMsg: ''
  },

  onLoad(options = {}) {
    const fileID = options.fileID ? decodeURIComponent(options.fileID) : '';
    const tempFileURL = options.temp ? decodeURIComponent(options.temp) : '';
    this.setData({ fileID, tempFileURL });
    this.loadImage();
  },

  loadImage() {
    const { fileID, tempFileURL } = this.data;
    if (fileID) {
      wx.cloud.downloadFile({
        fileID
      }).then(res => {
        if (res && res.tempFilePath) {
          wx.getImageInfo({
            src: res.tempFilePath,
            success: () => {
              this.setData({ imgSrc: res.tempFilePath, loading: false });
            },
            fail: (err) => {
              this.setData({ loading: false, errorMsg: (err && err.errMsg) || '图片解析失败' });
            }
          });
        } else {
          this.setData({ loading: false, errorMsg: '图片下载失败' });
        }
      }).catch(err => {
        this.setData({ loading: false, errorMsg: (err && err.errMsg) || '图片下载失败' });
      });
      return;
    }

    if (tempFileURL) {
      wx.getImageInfo({
        src: tempFileURL,
        success: () => {
          this.setData({ imgSrc: tempFileURL, loading: false });
        },
        fail: (err) => {
          this.setData({ loading: false, errorMsg: (err && err.errMsg) || '图片加载失败' });
        }
      });
      return;
    }

    this.setData({ loading: false, errorMsg: '缺少图片参数' });
  },

  onImgError(e) {
    const msg = e && e.detail && e.detail.errMsg ? e.detail.errMsg : '图片加载失败';
    this.setData({ errorMsg: msg, imgSrc: '' });
  },

  saveToAlbum() {
    if (this.data.saving) return;
    const src = this.data.imgSrc;
    if (!src) {
      wx.showToast({ title: '暂无图片', icon: 'none' });
      return;
    }
    this.setData({ saving: true });

    const save = (filePath) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          wx.showToast({ title: '已保存' });
        },
        fail: () => {
          wx.showToast({ title: '保存失败', icon: 'none' });
        },
        complete: () => {
          this.setData({ saving: false });
        }
      });
    };

    if (src.startsWith('http')) {
      wx.downloadFile({
        url: src,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            save(res.tempFilePath);
          } else {
            wx.showToast({ title: '下载失败', icon: 'none' });
            this.setData({ saving: false });
          }
        },
        fail: () => {
          wx.showToast({ title: '下载失败', icon: 'none' });
          this.setData({ saving: false });
        }
      });
      return;
    }

    save(src);
  }
});
