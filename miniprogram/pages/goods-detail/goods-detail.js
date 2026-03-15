// goods-detail.js
const app = getApp();
const api = require('../../utils/api.js');
const { formatPoints } = require('../../utils/format.js');

Page({
  data: {
    goodsId: '',
    goods: null,
    userInfo: {},
    address: null,
    remark: '',
    loading: true,
    showExchangeModal: false
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    this.setData({ goodsId: id, userInfo: app.globalData.userInfo || {} });
    this.loadGoodsDetail();
  },

  onShow() {
    const userInfo = app.globalData.userInfo || {};
    this.setData({ userInfo });
    this.updateFormattedPoints();
    if (this.data.goodsId) {
      this.loadDefaultAddress();
    }
  },

  // 更新格式化后的积分数据
  updateFormattedPoints() {
    const { userInfo, goods } = this.data;
    if (!goods) return;

    const formattedUserPoints = formatPoints(userInfo.points);
    const pointsDifference = goods.points - (userInfo.points || 0);
    const formattedPointsDifference = formatPoints(pointsDifference > 0 ? pointsDifference : 0);

    this.setData({
      formattedUserPoints,
      formattedPointsDifference
    });
  },

  // 加载商品详情
  loadGoodsDetail() {
    this.setData({ loading: true });
    api.getGoodsDetail(this.data.goodsId).then(res => {
      this.setData({
        goods: res.data,
        loading: false
      });
      this.updateFormattedPoints();
      this.loadDefaultAddress();
    }).catch(err => {
      console.error('加载商品详情失败', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 加载默认地址
  loadDefaultAddress() {
    api.getDefaultAddress().then(res => {
      if (res.data.length > 0) {
        this.setData({ address: res.data[0] });
      }
    }).catch(err => {
      console.error('加载地址失败', err);
    });
  },

  // 兑换商品
  handleExchange() {
    const { goods, userInfo } = this.data;
    if (!goods || goods.stock <= 0) {
      wx.showToast({
        title: '商品已兑完',
        icon: 'none'
      });
      return;
    }
    if (userInfo.points < goods.points) {
      wx.showToast({
        title: '积分不足',
        icon: 'none'
      });
      return;
    }
    this.setData({ showExchangeModal: true });
  },

  // 隐藏兑换弹窗
  hideExchangeModal() {
    this.setData({ showExchangeModal: false });
  },

  // 选择地址
  selectAddress() {
    wx.navigateTo({
      url: '/pages/address/address?select=1'
    });
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  // 确认兑换
  confirmExchange() {
    const { goods, address, remark } = this.data;

    if (!address) {
      wx.showToast({
        title: '请选择收货地址',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '兑换中...' });

    api.exchangeGoods({
      goodsId: goods._id,
      addressId: address._id,
      remark: remark
    }).then(res => {
      wx.hideLoading();
      this.hideExchangeModal();

      if (res.result.success) {
        wx.showToast({
          title: '兑换成功',
          icon: 'success'
        });

        // 刷新用户信息
        app.refreshUserInfo();

        // 刷新商品信息
        this.loadGoodsDetail();

        // 跳转到兑换记录
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/exchange-records/exchange-records'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '兑换失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('兑换失败', err);
      wx.showToast({
        title: '兑换失败',
        icon: 'none'
      });
    });
  },

  // 返回首页
  goToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 前往商城
  goToMall() {
    wx.switchTab({
      url: '/pages/mall/mall'
    });
  },

  // 阻止冒泡
  stopPropagation() {
    // do nothing
  },

  // 格式化积分
  formatPoints(points) {
    return formatPoints(points || 0);
  }
});
