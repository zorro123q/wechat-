// admin.js
const api = require('../../utils/api.js');
const { getOrderStatusText } = require('../../utils/format.js');

Page({
  data: {
    showGrantModal: false,
    showVerifyModal: false,
    searchKeyword: '',
    searchResults: [],
    selectedUser: null,
    grantPoints: '',
    grantReason: '',
    exchangeCode: '',
    verifyOrder: null
  },

  onLoad() {
    this.checkAdmin();
  },

  // 检查管理员权限
  checkAdmin() {
    api.checkAdmin().then(isAdmin => {
      if (!isAdmin) {
        wx.showModal({
          title: '无权限',
          content: '您没有管理员权限',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      }
    }).catch(err => {
      console.error('检查管理员权限失败', err);
    });
  },

  // 显示发放积分弹窗
  showGrantModal() {
    this.setData({
      showGrantModal: true,
      searchKeyword: '',
      searchResults: [],
      selectedUser: null,
      grantPoints: '',
      grantReason: ''
    });
  },

  // 隐藏发放积分弹窗
  hideGrantModal() {
    this.setData({ showGrantModal: false });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索用户
  searchUser() {
    const { searchKeyword } = this.data;
    if (!searchKeyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '搜索中...' });
    api.searchUsers(searchKeyword).then(res => {
      wx.hideLoading();
      this.setData({ searchResults: res.data });
    }).catch(err => {
      wx.hideLoading();
      console.error('搜索用户失败', err);
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    });
  },

  // 选择用户
  selectUser(e) {
    const { user } = e.currentTarget.dataset;
    this.setData({
      selectedUser: user,
      searchResults: []
    });
  },

  // 积分输入
  onPointsInput(e) {
    this.setData({ grantPoints: e.detail.value });
  },

  // 事由输入
  onReasonInput(e) {
    this.setData({ grantReason: e.detail.value });
  },

  // 确认发放
  confirmGrant() {
    const { selectedUser, grantPoints, grantReason } = this.data;

    if (!selectedUser) {
      wx.showToast({
        title: '请选择学员',
        icon: 'none'
      });
      return;
    }

    const points = parseInt(grantPoints);
    if (!points || points <= 0) {
      wx.showToast({
        title: '请输入正确的积分数量',
        icon: 'none'
      });
      return;
    }

    if (!grantReason) {
      wx.showToast({
        title: '请输入发放事由',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '发放中...' });
    api.adminGrantPoints({
      userId: selectedUser._id,
      points: points,
      reason: grantReason
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({
          title: '发放成功',
          icon: 'success'
        });
        this.hideGrantModal();
      } else {
        wx.showToast({
          title: res.result.message || '发放失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('发放积分失败', err);
      wx.showToast({
        title: '发放失败',
        icon: 'none'
      });
    });
  },

  // 显示核销弹窗
  showVerifyModal() {
    this.setData({
      showVerifyModal: true,
      exchangeCode: '',
      verifyOrder: null
    });
  },

  // 隐藏核销弹窗
  hideVerifyModal() {
    this.setData({ showVerifyModal: false });
  },

  // 兑换码输入
  onCodeInput(e) {
    this.setData({ exchangeCode: e.detail.value });
    if (e.detail.value.length >= 8) {
      this.searchOrder(e.detail.value);
    }
  },

  // 扫码
  scanCode() {
    wx.scanCode({
      success: (res) => {
        this.setData({ exchangeCode: res.result });
        this.searchOrder(res.result);
      },
      fail: (err) => {
        console.error('扫码失败', err);
      }
    });
  },

  // 搜索订单
  searchOrder(code) {
    if (!code) return;

    wx.showLoading({ title: '查询中...' });
    const db = wx.cloud.database();
    db.collection('orders')
      .where({ exchangeCode: code })
      .get()
      .then(res => {
        wx.hideLoading();
        if (res.data.length > 0) {
          this.setData({ verifyOrder: res.data[0] });
        } else {
          wx.showToast({
            title: '未找到订单',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('查询订单失败', err);
        wx.showToast({
          title: '查询失败',
          icon: 'none'
        });
      });
  },

  // 确认核销
  confirmVerify() {
    const { verifyOrder } = this.data;
    if (!verifyOrder) return;

    wx.showLoading({ title: '核销中...' });
    api.verifyOrder(verifyOrder.exchangeCode).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({
          title: '核销成功',
          icon: 'success'
        });
        this.hideVerifyModal();
      } else {
        wx.showToast({
          title: res.result.message || '核销失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('核销失败', err);
      wx.showToast({
        title: '核销失败',
        icon: 'none'
      });
    });
  },

  // 页面跳转
  goToGrantPoints() {
    this.showGrantModal();
  },

  goToPointsLog() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  goToVerifyOrder() {
    this.showVerifyModal();
  },

  goToOrderList() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  goToGoodsManage() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  goToCategoryManage() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  goToUserList() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 获取订单状态文本
  getOrderStatusText(status) {
    return getOrderStatusText(status);
  },

  // 阻止冒泡
  stopPropagation() {
    // do nothing
  }
});
