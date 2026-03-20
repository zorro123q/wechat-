// index.js
const app = getApp();
const api = require('../../utils/api.js');
const { formatPoints, formatRelativeTime } = require('../../utils/format.js');

Page({
  data: {
    userInfo: {},
    effectiveLevelKey: 'junior',
    effectiveLevelName: '初级训机师',
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
    const tasks = [
      this.loadLevels(),
      this.loadNotices(),
      this.loadHotGoods()
    ];
    if (app.globalData.hasLogin) {
      tasks.unshift(this.loadUserInfo());
    }
    return Promise.all(tasks);
  },

  // 登录
  login() {
    wx.showLoading({ title: '加载中...' });
    app.login().then(userInfo => {
      wx.hideLoading();
      this.loadUserBundle({ userInfo, force: true });
    }).catch(err => {
      wx.hideLoading();
    });
  },

  loadUserBundle(options = {}) {
    const force = !!options.force;
    const userInfoPromise = options.userInfo
      ? Promise.resolve(options.userInfo)
      : api.getUserInfoCached({ force });
    const userPublicPromise = api.getUserPublicCached({}, { force });

    return Promise.allSettled([userInfoPromise, userPublicPromise]).then(([uRes, pRes]) => {
      const userInfo = uRes.status === 'fulfilled' ? uRes.value : null;
      const userPublic = pRes.status === 'fulfilled'
        ? (pRes.value && pRes.value.result && pRes.value.result.userPublic ? pRes.value.result.userPublic : null)
        : null;

      if (userInfo) {
        app.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);
      }

      const topCert = userPublic && userPublic.topCertificate ? userPublic.topCertificate : null;
      let key = '';
      if (topCert && typeof topCert.level === 'number') {
        if (topCert.level >= 3) key = 'senior';
        else if (topCert.level === 2) key = 'intermediate';
        else if (topCert.level === 1) key = 'junior';
      }
      const fallbackLevelKey = (userInfo && userInfo.level) || this.data.userInfo.level || 'junior';
      const effectiveLevelKey = key || fallbackLevelKey;

      const nextData = {
        effectiveLevelKey,
        effectiveLevelName: this.getLevelName(effectiveLevelKey)
      };
      if (userInfo) {
        nextData.userInfo = userInfo;
        nextData.formattedAvailablePoints = formatPoints(userInfo.points);
        nextData.formattedTotalPoints = formatPoints(userInfo.totalPoints);
      }
      this.setData(nextData);

      if (userInfo) {
        const isComplete = app.isRegistrationComplete ? app.isRegistrationComplete(userInfo) : true;
        if (!isComplete) {
          wx.showModal({
            title: '完善资料',
            content: '请先完善个人信息后再使用小程序功能。',
            showCancel: false,
            confirmText: '去完善',
            success: () => {
              wx.navigateTo({ url: '/pages/register/register' });
            }
          });
        }
      }
    });
  },

  // 加载用户信息
  loadUserInfo() {
    return this.loadUserBundle({ force: false }).catch(err => {
      const needLogin = err && (err.code === 'NEED_LOGIN' || err.message === 'NEED_LOGIN');
      if (needLogin) {
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
      console.error('加载用户信息失败', err);
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
      // 设置默认等级
      this.setData({
        levels: [
          { key: 'junior', name: '初级训机师' },
          { key: 'intermediate', name: '中级训机师' },
          { key: 'senior', name: '高级训机师' }
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
