// app.js
App({
  globalData: {
    userInfo: null,
    hasLogin: false,
    token: null,
    userId: null
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-9g74940pe1465d55', // 替换为你的云开发环境ID
        traceUser: true
      });
    }

    // 检查登录状态
    this.checkLogin();
  },

  isRegistrationComplete(userInfo) {
    const u = userInfo || {};
    const name = String(u.name || '').trim();
    const phone = String(u.phone || '').trim();
    const school = String(u.school || '').trim();
    const company = String(u.company || '').trim();
    const role = String(u.role || '').trim();
    const experience = String(u.experience || '').trim();
    return !!(name && phone && school && company && role && experience);
  },

  // 检查登录状态
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('authToken');
    const userId = wx.getStorageSync('userId');
    if (userInfo && token && userId) {
      this.globalData.userInfo = userInfo;
      this.globalData.token = token;
      this.globalData.userId = userId;
      this.globalData.hasLogin = true;
    } else {
      this.globalData.userInfo = null;
      this.globalData.token = token || null;
      this.globalData.userId = userId || null;
      this.globalData.hasLogin = false;
    }
  },

  // 登录
  login() {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('authToken');
      wx.cloud.callFunction({
        name: 'login',
        data: { action: 'check', token }
      }).then(res => {
        const result = res.result || {};
        if (result.success && result.userInfo) {
          this.globalData.userInfo = result.userInfo;
          this.globalData.hasLogin = true;
          this.globalData.token = token;
          this.globalData.userId = result.userInfo._id;
          wx.setStorageSync('userInfo', result.userInfo);
          wx.setStorageSync('userId', result.userInfo._id);
          resolve(result.userInfo);
          return;
        }

        this.globalData.hasLogin = false;
        this.globalData.userInfo = null;
        this.globalData.token = null;
        this.globalData.userId = null;
        wx.reLaunch({ url: '/pages/login/login' });
        reject(new Error(result.message || 'NEED_LOGIN'));
      }).catch(err => {
        console.error('登录失败', err);
        this.globalData.hasLogin = false;
        this.globalData.userInfo = null;
        this.globalData.token = null;
        this.globalData.userId = null;
        wx.reLaunch({ url: '/pages/login/login' });
        reject(err);
      });
    });
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo;
  },

  // 刷新用户信息
  refreshUserInfo() {
    const token = wx.getStorageSync('authToken');
    if (!token) return;
    wx.cloud.callFunction({
      name: 'login',
      data: { action: 'check', token }
    }).then(res => {
      const result = res.result || {};
      if (result.success && result.userInfo) {
        this.globalData.userInfo = result.userInfo;
        this.globalData.hasLogin = true;
        this.globalData.token = token;
        this.globalData.userId = result.userInfo._id;
        wx.setStorageSync('userInfo', result.userInfo);
        wx.setStorageSync('userId', result.userInfo._id);
      }
    });
  }
});
