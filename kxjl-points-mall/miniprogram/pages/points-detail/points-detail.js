// points-detail.js
const app = getApp();
const api = require('../../utils/api.js');
const { formatPoints, formatTime } = require('../../utils/format.js');

Page({
  data: {
    userInfo: {},
    logsList: [],
    currentType: '',
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    });
    Promise.all([
      this.loadUserInfo(),
      this.loadLogs(true)
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLogs();
    }
  },

  initPage() {
    this.setData({ userInfo: app.globalData.userInfo || {} });
    this.loadLogs(true);
  },

  // 加载用户信息
  loadUserInfo() {
    return api.getUserInfo().then(userInfo => {
      app.globalData.userInfo = userInfo;
      this.setData({ userInfo });
    }).catch(err => {
      console.error('加载用户信息失败', err);
    });
  },

  // 加载积分明细
  loadLogs(refresh = false) {
    if (this.data.loading) return Promise.resolve();

    const { page, pageSize, currentType } = this.data;
    const currentPage = refresh ? 1 : page;

    this.setData({ loading: true });

    return api.getPointsLogs({
      type: currentType,
      page: currentPage,
      pageSize
    }).then(res => {
      const newList = res.data || [];
      this.setData({
        logsList: refresh ? newList : [...this.data.logsList, ...newList],
        page: currentPage + 1,
        hasMore: newList.length >= pageSize,
        loading: false
      });
    }).catch(err => {
      console.error('加载积分明细失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 选择筛选类型
  selectType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({
      currentType: type,
      page: 1,
      hasMore: true
    });
    this.loadLogs(true);
  },

  // 格式化积分
  formatPoints(points) {
    return formatPoints(points || 0);
  },

  // 格式化时间
  formatTime(time) {
    return formatTime(time, 'MM-DD HH:mm');
  }
});
