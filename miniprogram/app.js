// app.js
App({
  globalData: {
    userInfo: null,
    hasLogin: false,
    openid: null
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

  // 检查登录状态
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    if (userInfo && openid) {
      this.globalData.userInfo = userInfo;
      this.globalData.openid = openid;
      this.globalData.hasLogin = true;
    }
  },

  // 登录
  login() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login'
      }).then(res => {
        const { openid, userInfo } = res.result;
        this.globalData.openid = openid;
        this.globalData.userInfo = userInfo;
        this.globalData.hasLogin = true;
        wx.setStorageSync('openid', openid);
        wx.setStorageSync('userInfo', userInfo);
        resolve(userInfo);
      }).catch(err => {
        console.error('登录失败', err);
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
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: this.globalData.openid
    }).get().then(res => {
      if (res.data.length > 0) {
        this.globalData.userInfo = res.data[0];
        wx.setStorageSync('userInfo', res.data[0]);
      }
    });
  }
});
