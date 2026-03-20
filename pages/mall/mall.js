// mall.js
const app = getApp();
const api = require('../../utils/api.js');
const { formatPoints } = require('../../utils/format.js');

Page({
  data: {
    userInfo: {},
    categories: [],
    goodsList: [],
    currentCategory: '',
    keyword: '',
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
    goodsUpdatedAt: 0
  },

  isCloudFileId(s) {
    const v = String(s || '').trim();
    return v.startsWith('cloud://') || v.startsWith('cloudbase://');
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (app.globalData.userInfo) {
      const userInfo = app.globalData.userInfo;
      this.setData({
        userInfo: userInfo,
        formattedPoints: formatPoints(userInfo.points)
      });
    }
    let updatedAt = 0;
    try {
      updatedAt = Number(wx.getStorageSync('goodsUpdatedAt') || 0);
    } catch (_) { }
    if (updatedAt && updatedAt !== this.data.goodsUpdatedAt) {
      this.setData({ goodsUpdatedAt: updatedAt, page: 1, hasMore: true });
      this.loadGoods(true);
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    });
    this.loadGoods(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadGoods();
    }
  },

  initPage() {
    this.setData({ userInfo: app.globalData.userInfo || {} });
    this.loadCategories();
    this.loadGoods(true);
  },

  // 加载分类
  loadCategories() {
    api.getCategories().then(res => {
      const list = res.data || [];
      if (list.length === 0) {
        this.setData({
          categories: [
            { name: '实物奖品', icon: '🎁', sort: 1, _id: 'physical' },
            { name: '虚拟商品', icon: '💳', sort: 2, _id: 'virtual' },
            { name: '优惠券', icon: '🎫', sort: 3, _id: 'coupon' }
          ]
        });
        return;
      }
      this.setData({ categories: list });
    }).catch(err => {
      console.error('加载分类失败', err);
    });
  },

  // 加载商品
  loadGoods(refresh = false) {
    if (this.data.loading) return Promise.resolve();

    const { page, pageSize, currentCategory, keyword } = this.data;
    const currentPage = refresh ? 1 : page;

    this.setData({ loading: true });

    return api.getGoods({
      category: currentCategory,
      keyword,
      page: currentPage,
      pageSize
    }).then(res => {
      const raw = res.data || [];
      const fileIds = [];
      const mapped = raw.map(g => {
        const cover = g && g.images && g.images[0] ? g.images[0] : '';
        if (this.isCloudFileId(cover)) fileIds.push(cover);
        return { ...g, coverUrl: cover };
      });

      const finalize = (list) => {
        this.setData({
          goodsList: refresh ? list : [...this.data.goodsList, ...list],
          page: currentPage + 1,
          hasMore: list.length >= pageSize,
          loading: false
        });
      };

      if (fileIds.length === 0) {
        finalize(mapped);
        return;
      }

      api.getTempFileURLCached(fileIds).then(map => {
        const withUrls = mapped.map(g => {
          if (this.isCloudFileId(g.coverUrl)) {
            return { ...g, coverUrl: map[g.coverUrl] || g.coverUrl };
          }
          return g;
        });
        finalize(withUrls);
      }).catch(() => {
        finalize(mapped);
      });
    }).catch(err => {
      console.error('加载商品失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 选择分类
  selectCategory(e) {
    const { category } = e.currentTarget.dataset;
    this.setData({
      currentCategory: category,
      page: 1,
      hasMore: true
    });
    this.loadGoods(true);
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 执行搜索
  onSearch() {
    this.setData({
      page: 1,
      hasMore: true
    });
    this.loadGoods(true);
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      keyword: '',
      page: 1,
      hasMore: true
    });
    this.loadGoods(true);
  },

  // 跳转商品详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  },

  // 快速兑换
  onQuickExchange(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  },

  // 格式化积分
  formatPoints(points) {
    return formatPoints(points || 0);
  }
});
