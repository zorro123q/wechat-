// profile.js
const app = getApp();
const api = require('../../utils/api.js');
const { getLevelInfo, formatPoints, maskPhone } = require('../../utils/format.js');

Page({
  data: {
    userInfo: {},
    levelInfo: {},
    levels: [],
    isAdmin: false,
    showLevelModal: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
      this.updateLevelInfo(app.globalData.userInfo.points);
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
      this.setData({ userInfo });
      this.updateLevelInfo(userInfo.points);
    }).catch(err => {
      console.error('加载用户信息失败', err);
    });
  },

  // 更新等级信息
  updateLevelInfo(points) {
    const levelInfo = getLevelInfo(points);
    this.setData({ levelInfo });
  },

  // 加载等级配置
  loadLevels() {
    return api.getLevels().then(res => {
      this.setData({ levels: res.data });
    }).catch(err => {
      console.error('加载等级配置失败', err);
      this.setData({
        levels: [
          { key: 'junior', name: '初级训机师', minPoints: 0 },
          { key: 'intermediate', name: '中级训机师', minPoints: 1000 },
          { key: 'senior', name: '高级训机师', minPoints: 5000 }
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
      content: '科讯嘉联训机师学院\n积分管理平台 v1.0.0',
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
  }
});
