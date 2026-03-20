// exchange-records.js
const api = require('../../utils/api.js');
const { formatTime, getOrderStatusText, getOrderStatusColor } = require('../../utils/format.js');

Page({
  data: {
    ordersList: [],
    currentStatus: '',
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.initPage();
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    });
    this.loadOrders(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrders();
    }
  },

  initPage() {
    this.loadOrders(true);
  },

  // 加载订单列表
  loadOrders(refresh = false) {
    if (this.data.loading) return Promise.resolve();

    const { page, pageSize, currentStatus } = this.data;
    const currentPage = refresh ? 1 : page;

    this.setData({ loading: true });

    return api.getOrders({
      status: currentStatus,
      page: currentPage,
      pageSize
    }).then(res => {
      const newList = res.data || [];
      this.setData({
        ordersList: refresh ? newList : [...this.data.ordersList, ...newList],
        page: currentPage + 1,
        hasMore: newList.length >= pageSize,
        loading: false
      });
    }).catch(err => {
      console.error('加载订单列表失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 选择筛选状态
  selectStatus(e) {
    const { status } = e.currentTarget.dataset;
    this.setData({
      currentStatus: status,
      page: 1,
      hasMore: true
    });
    this.loadOrders(true);
  },

  // 跳转订单详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.showToast({
      title: '查看详情',
      icon: 'none'
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

  // 跳转商城
  goToMall() {
    wx.switchTab({
      url: '/pages/mall/mall'
    });
  },

  // 格式化时间
  formatTime(time) {
    return formatTime(time, 'YYYY-MM-DD HH:mm');
  },

  // 获取订单状态文本
  getStatusText(status) {
    return getOrderStatusText(status);
  },

  // 获取订单状态颜色
  getStatusColor(status) {
    return getOrderStatusColor(status);
  }
});
