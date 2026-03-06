// index.js
const app = getApp();
const api = require('../../utils/api.js');
const { getLevelInfo, formatPoints, formatRelativeTime } = require('../../utils/format.js');

Page({
  data: {
    userInfo: {},
    levelInfo: {},
    levels: [],
    notices: [],
    hotGoods: [],
    showLevelModal: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新用户信息
    if (app.globalData.hasLogin) {
      this.loadUserInfo();
    } else {
      this.login();
    }
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
      this.loadNotices(),
      this.loadHotGoods()
    ]);
  },

  // 登录
  login() {
    wx.showLoading({ title: '加载中...' });
    app.login().then(userInfo => {
      wx.hideLoading();
      this.setData({ userInfo });
      this.updateLevelInfo(userInfo.points);
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    });
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
      // 设置默认等级
      this.setData({
        levels: [
          { key: 'junior', name: '初级训机师', minPoints: 0 },
          { key: 'intermediate', name: '中级训机师', minPoints: 1000 },
          { key: 'senior', name: '高级训机师', minPoints: 5000 }
        ]
      });
    });
  },

  // 加载公告
  loadNotices() {
    return api.getNotices().then(res => {
      this.setData({ notices: res.data });
    }).catch(err => {
      console.error('加载公告失败', err);
    });
  },

  // 加载热门商品
  loadHotGoods() {
    return api.getGoods({ pageSize: 6 }).then(res => {
      this.setData({ hotGoods: res.data });
    }).catch(err => {
      console.error('加载热门商品失败', err);
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

  // 跳转商城
  goToMall() {
    wx.switchTab({
      url: '/pages/mall/mall'
    });
  },

  // 跳转个人中心
  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    });
  },

  // 跳转商品详情
  goToGoodsDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
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

  // 查看公告详情
  viewNotice(e) {
    const { notice } = e.currentTarget.dataset;
    wx.showModal({
      title: notice.title,
      content: notice.content || '暂无详情',
      showCancel: false
    });
  },

  // 阻止冒泡
  stopPropagation() {
    // do nothing
  },

  // 格式化积分
  formatPoints(points) {
    return formatPoints(points || 0);
  },

  // 格式化时间
  formatRelativeTime(time) {
    return formatRelativeTime(time);
  }
});
