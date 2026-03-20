// profile.js
const app = getApp();
const api = require('../../utils/api.js');
const { formatPoints, maskPhone } = require('../../utils/format.js');
const { ensureImageUnderLimit } = require('../../utils/upload.js');

Page({
  data: {
    userInfo: {},
    levels: [],
    isAdmin: false,
    showLevelModal: false,
    certUploaded: false,
    effectiveLevelKey: 'junior',
    effectiveLevelName: '初级训机师'
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.loadUserInfo();
    this.loadCertUploadStatus();
    this.checkAdmin();
  },

  onPullDownRefresh() {
    this.initPage().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  initPage() {
    return Promise.all([
      this.loadUserInfo(),
      this.loadLevels(),
      this.loadCertUploadStatus(),
      this.checkAdmin()
    ]);
  },

  // 加载用户信息
  loadUserInfo() {
    return Promise.allSettled([
      api.getUserInfoCached({ force: false }),
      api.getUserPublicCached({}, { force: false })
    ]).then(([uRes, pRes]) => {
      const userInfo = uRes.status === 'fulfilled' ? uRes.value : null;
      const userPublic = pRes.status === 'fulfilled'
        ? (pRes.value && pRes.value.result && pRes.value.result.userPublic ? pRes.value.result.userPublic : null)
        : null;

      const topCert = userPublic && userPublic.topCertificate ? userPublic.topCertificate : null;
      const topCertName = topCert ? (topCert.certName || '') : '';
      const displayName = topCertName.replace(/(证书|认证)$/, '');
      let topCertLevelKey = '';
      if (topCert && typeof topCert.level === 'number') {
        if (topCert.level >= 3) topCertLevelKey = 'senior';
        else if (topCert.level === 2) topCertLevelKey = 'intermediate';
        else if (topCert.level === 1) topCertLevelKey = 'junior';
      }

      const fallbackLevelKey = (userInfo && userInfo.level) || this.data.userInfo.level || 'junior';
      const effectiveLevelKey = topCertLevelKey || fallbackLevelKey;

      const nextData = {
        topCertName: displayName,
        topCertLevelKey,
        effectiveLevelKey,
        effectiveLevelName: this.getLevelName(effectiveLevelKey)
      };
      if (userInfo) {
        app.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);
        nextData.userInfo = userInfo;
        nextData.formattedAvailablePoints = formatPoints(userInfo.points);
        nextData.formattedTotalPoints = formatPoints(userInfo.totalPoints);
      }
      this.setData(nextData);
    }).catch(err => {
      console.error('加载用户信息失败', err);
      wx.reLaunch({ url: '/pages/login/login' });
    });
  },

  // 获取等级名称
  getLevelName(levelKey) {
    const levelNames = {
      'junior': '初级训机师',
      'intermediate': '中级训机师',
      'senior': '高级训机师'
    };
    return levelNames[levelKey] || '初级训机师';
  },

  // 加载等级配置
  loadLevels() {
    return api.getLevels().then(res => {
      this.setData({ levels: res.data });
    }).catch(err => {
      console.error('加载等级配置失败', err);
      this.setData({
        levels: [
          { key: 'junior', name: '初级训机师' },
          { key: 'intermediate', name: '中级训机师' },
          { key: 'senior', name: '高级训机师' }
        ]
      });
    });
  },

  // 检查是否是管理员
  checkAdmin() {
    return api.checkAdmin().then(isAdmin => {
      this.setData({ isAdmin });
      return isAdmin;
    }).catch(err => {
      console.error('检查管理员权限失败', err);
      this.setData({ isAdmin: false });
      return false;
    });
  },

  loadCertUploadStatus() {
    return api.getUploadedCertificates().then(res => {
      const rows = res.data || [];
      const uploaded = rows.length > 0;
      this.setData({ certUploaded: uploaded });
      return uploaded;
    }).catch(() => {
      this.setData({ certUploaded: false });
      return false;
    });
  },

  changeAvatar() {
    const token = wx.getStorageSync('authToken');
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const userId = wx.getStorageSync('userId') || (this.data.userInfo && this.data.userInfo._id) || '';
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res && res.tempFilePaths && res.tempFilePaths[0];
        if (!filePath) return;
        const ext = (filePath.split('.').pop() || 'jpg').toLowerCase();
        const cloudPath = `avatars/${userId}/${Date.now()}_${Math.floor(Math.random() * 100000)}.${ext}`;

        wx.showLoading({ title: '上传中...' });
        ensureImageUnderLimit(filePath).then(safePath => {
          return wx.cloud.uploadFile({ cloudPath, filePath: safePath });
        }).then(r => {
          const fileID = r && r.fileID;
          if (!fileID) throw new Error('UPLOAD_FAILED');
          return api.updateUserProfile(userId, { avatar: fileID });
        }).then(() => {
          return api.getUserInfoCached({ force: true }).then(userInfo => {
            app.globalData.userInfo = userInfo;
            wx.setStorageSync('userInfo', userInfo);
            this.setData({ userInfo });
          });
        }).then(() => {
          wx.hideLoading();
          wx.showToast({ title: '已更新' });
        }).catch(err => {
          wx.hideLoading();
          if (err && err.code === 'FILE_TOO_LARGE') {
            wx.showToast({ title: '图片过大，请换一张小于2MB的图片', icon: 'none' });
            return;
          }
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      }
    });
  },

  dailyCheckIn() {
    wx.showLoading({ title: '签到中...' });
    api.dailyCheckIn().then(res => {
      wx.hideLoading();
      const result = (res && res.result) || {};
      if (result.success) {
        const addedPoints = Number(result.addedPoints || 0);
        if (result.alreadyCheckedIn || addedPoints <= 0) {
          wx.showToast({ title: '今天已签到', icon: 'none' });
        } else {
          wx.showToast({ title: `+${addedPoints} 积分` });
        }
        this.loadUserInfo();
      } else {
        const msg = String(result.message || '');
        if (msg === 'NEED_LOGIN') {
          wx.removeStorageSync('authToken');
          wx.removeStorageSync('userId');
          wx.removeStorageSync('userInfo');
          app.globalData.hasLogin = false;
          app.globalData.token = null;
          app.globalData.userId = null;
          app.globalData.userInfo = null;
          wx.reLaunch({ url: '/pages/login/login' });
          return;
        }
        if (msg.includes('duplicate') || msg.includes('conflict') || msg.includes('已存在') || msg.includes('重复')) {
          wx.showToast({ title: '今天已签到', icon: 'none' });
        } else {
          wx.showToast({ title: result.message || '签到失败', icon: 'none' });
        }
      }
    }).catch(err => {
      wx.hideLoading();
      const msg = String(err && (err.message || err.errMsg || err.errmsg || '') || '');
      if (msg === 'NEED_LOGIN') {
        wx.removeStorageSync('authToken');
        wx.removeStorageSync('userId');
        wx.removeStorageSync('userInfo');
        app.globalData.hasLogin = false;
        app.globalData.token = null;
        app.globalData.userId = null;
        app.globalData.userInfo = null;
        wx.reLaunch({ url: '/pages/login/login' });
        return;
      }
      wx.showToast({ title: '签到失败，请稍后重试', icon: 'none' });
    });
  },

  // 跳转积分明细
  goToPointsDetail() {
    wx.navigateTo({
      url: '/pages/points-detail/points-detail'
    });
  },

  // 跳转兑换记录
  goToExchangeRecords() {
    wx.navigateTo({
      url: '/pages/exchange-records/exchange-records'
    });
  },

  // 跳转地址管理
  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  goToProfileEdit() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit'
    });
  },

  // 跳转我的证书
  goToMyCertificates() {
    wx.navigateTo({
      url: '/pages/my-certificates/my-certificates'
    });
  },

  goToUploadCertificate() {
    wx.navigateTo({ url: '/pages/upload-certificate/upload-certificate' });
  },

  // 跳转管理后台
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;

        const token = wx.getStorageSync('authToken');
        const cleanup = () => {
          wx.removeStorageSync('authToken');
          wx.removeStorageSync('userId');
          wx.removeStorageSync('userInfo');
          app.globalData.hasLogin = false;
          app.globalData.token = null;
          app.globalData.userId = null;
          app.globalData.userInfo = null;
          wx.reLaunch({ url: '/pages/login/login' });
        };

        if (!token) {
          cleanup();
          return;
        }

        wx.cloud.callFunction({
          name: 'login',
          data: { action: 'logout', token }
        }).then(() => cleanup()).catch(() => cleanup());
      }
    });
  },



  // 显示等级说明
  showLevelGuide() {
    this.setData({ showLevelModal: true });
  },

  // 隐藏等级说明
  hideLevelGuide() {
    this.setData({ showLevelModal: false });
  },

  // 阻止冒泡
  stopPropagation() {
    // do nothing
  },

  // 格式化积分
  formatPoints(points) {
    return formatPoints(points || 0);
  },

  // 脱敏手机号
  maskPhone(phone) {
    return maskPhone(phone);
  },

  // 跳转升级权限预览
  goToUpgradePreview() {
    console.log('触发升级权限预览跳转');
    wx.navigateTo({
      url: '/upgradePreview/upgradePreview',
      fail: (err) => {
        console.error('跳转升级权限预览页失败：', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-xxx-xxxx\n工作时间：9:00-18:00',
      showCancel: false
    });
  },

  generatePromoCode() {
    const user = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    const referralCode = user.referralCode || '';
    if (!referralCode) {
      wx.showToast({ title: '暂无推荐码', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '生成中...' });
    api.generateMiniProgramCode({
      referralCode,
      width: 430,
      returnType: 'file'
    }).then(res => {
      wx.hideLoading();
      const r = res && res.result;
      if (!r || !r.success) {
        wx.showToast({ title: (r && r.message) || '生成失败', icon: 'none' });
        return;
      }

      if (r.fileID) {
        wx.navigateTo({
          url: `/pages/promo-code/promo-code?fileID=${encodeURIComponent(r.fileID)}&temp=${encodeURIComponent(r.tempFileURL || '')}`
        });
        return;
      }

      if (r.tempFileURL) {
        wx.navigateTo({
          url: `/pages/promo-code/promo-code?temp=${encodeURIComponent(r.tempFileURL)}`
        });
        return;
      }

      wx.showToast({ title: '生成失败', icon: 'none' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    });
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '科讯嘉联训机师学苑\n积分管理平台 v1.0.0',
      showCancel: false
    });
  }
});
