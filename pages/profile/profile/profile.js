// profile.js
const app = getApp();
const api = require('../../utils/api.js');
const { formatPoints, maskPhone } = require('../../utils/format.js');

Page({
  data: {
    userInfo: {},
    levels: [],
    isAdmin: false,
    showLevelModal: false,
    hasCheckedIn: false,
    isCheckingIn: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
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
      this.checkAdmin()
    ]);
  },

  // 加载用户信息
  loadUserInfo() {
    return api.getUserInfo().then(userInfo => {
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      this.setData({
        userInfo,
        // 在这里直接格式化数据
        formattedAvailablePoints: formatPoints(userInfo.points),
        formattedTotalPoints: formatPoints(userInfo.totalPoints)
      });
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
    }).catch(err => {
      console.error('检查管理员权限失败', err);
    });
  },

  // 添加测试积分
  addTestPoints() {
    wx.showLoading({ title: '正在添加...' });
    wx.cloud.callFunction({
      name: 'addTestPoints',
      data: { token: wx.getStorageSync('authToken') }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({ title: '添加成功' });
        // 刷新用户信息和积分明细
        this.loadUserInfo();
      } else {
        wx.showToast({ title: res.result.message || '添加失败', icon: 'none' });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '请求失败', icon: 'none' });
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

  // 跳转管理后台
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
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

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '科讯嘉联训机师学苑\n积分管理平台 v1.0.0',
      showCancel: false
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

  // 每日签到
  dailyCheckIn() {
    this.setData({ isCheckingIn: true });

    wx.cloud.callFunction({
      name: 'dailyCheckIn',
      data: { token: wx.getStorageSync('authToken') }
    }).then(res => {
      this.setData({ isCheckingIn: false });

      if (res.result && res.result.success) {
        const addedPoints = res.result.data && res.result.data.addedPoints || 100;
        wx.showToast({
          title: `签到成功，+${addedPoints}积分`,
          icon: 'success'
        });
        // 更新签到状态和积分
        this.setData({ hasCheckedIn: true });
        // 重新加载用户信息，更新积分
        this.loadUserInfo();
      } else {
        wx.showToast({
          title: res.result.message || '签到失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ isCheckingIn: false });
      console.error('签到失败', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  }
});
