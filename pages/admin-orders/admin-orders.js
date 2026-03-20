const api = require('../../utils/api.js');
const { formatTime } = require('../../utils/format.js');

Page({
  data: {
    keyword: '',
    statusOptions: ['全部', '待发货', '已发货', '已完成', '已取消'],
    statusIndex: 0,
    status: '',
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    showDetail: false,
    detail: {},
    editingExpressCompany: '',
    editingExpressNo: '',
    operating: false
  },

  isCloudFileId(s) {
    const v = String(s || '').trim();
    return v.startsWith('cloud://') || v.startsWith('cloudbase://');
  },

  statusToText(status) {
    const s = String(status || '');
    if (!s) return '待发货';
    if (s === 'pending') return '待发货';
    if (s === 'shipped') return '已发货';
    if (s === 'completed') return '已完成';
    if (s === 'cancelled') return '已取消';
    return s || '--';
  },

  statusToKey(status) {
    const s = String(status || '');
    if (!s) return 'pending';
    if (s === 'pending' || s === 'shipped' || s === 'completed' || s === 'cancelled') return s;
    return 'pending';
  },

  onLoad() {
    this.loadList(true);
  },

  onPullDownRefresh() {
    this.loadList(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore();
  },

  stop() { },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onStatusChange(e) {
    const idx = Number(e.detail.value || 0);
    const map = ['', 'pending', 'shipped', 'completed', 'cancelled'];
    this.setData({ statusIndex: idx, status: map[idx] || '' });
    this.loadList(true);
  },

  reload() {
    this.loadList(true);
  },

  loadMore() {
    this.loadList(false);
  },

  loadList(refresh) {
    if (this.data.loading) return Promise.resolve();
    const page = refresh ? 1 : this.data.page;
    this.setData({ loading: true });

    return api.adminListOrders({
      page,
      pageSize: this.data.pageSize,
      status: this.data.status,
      keyword: String(this.data.keyword || '').trim()
    }).then(res => {
      const rows = (res.data || []).map(o => ({
        ...o,
        formattedTime: formatTime(o.createTime, 'YYYY-MM-DD HH:mm'),
        statusKey: this.statusToKey(o.status),
        statusText: this.statusToText(o.status),
        goodsImageUrl: o.goodsImage || '',
        userAvatarUrl: o.userAvatar || ''
      }));

      const fileIds = [];
      rows.forEach(o => {
        if (this.isCloudFileId(o.goodsImageUrl)) fileIds.push(o.goodsImageUrl);
        if (this.isCloudFileId(o.userAvatarUrl)) fileIds.push(o.userAvatarUrl);
      });

      const finalize = (list) => {
        this.setData({
          list: refresh ? list : this.data.list.concat(list),
          page: page + 1,
          hasMore: list.length >= this.data.pageSize,
          loading: false
        });
      };

      if (fileIds.length === 0) {
        finalize(rows);
        return;
      }

      api.getTempFileURLCached(fileIds).then(map => {
        const merged = rows.map(o => ({
          ...o,
          goodsImageUrl: this.isCloudFileId(o.goodsImageUrl) ? (map[o.goodsImageUrl] || '') : o.goodsImageUrl,
          userAvatarUrl: this.isCloudFileId(o.userAvatarUrl) ? (map[o.userAvatarUrl] || '') : o.userAvatarUrl
        }));
        finalize(merged);
      }).catch(() => {
        finalize(rows);
      });
    }).catch(err => {
      this.setData({ loading: false });
      const needLogin = err && (err.code === 'NEED_LOGIN' || err.message === 'NEED_LOGIN');
      if (needLogin) {
        wx.reLaunch({ url: '/pages/login/login' });
        return;
      }
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  openDetail(e) {
    const item = e.currentTarget.dataset.item || {};
    this.setData({
      showDetail: true,
      detail: { ...item, statusKey: this.statusToKey(item.status), statusText: this.statusToText(item.status) },
      editingExpressCompany: item.expressCompany || '',
      editingExpressNo: item.expressNo || ''
    });
  },

  closeDetail() {
    this.setData({
      showDetail: false,
      detail: {},
      editingExpressCompany: '',
      editingExpressNo: ''
    });
  },

  onExpressCompanyInput(e) {
    this.setData({ editingExpressCompany: e.detail.value });
  },

  onExpressNoInput(e) {
    this.setData({ editingExpressNo: e.detail.value });
  },

  markShipped() {
    const d = this.data.detail || {};
    if (!d._id) return;
    if (this.data.operating) return;
    if (String(d.status) !== 'pending') {
      wx.showToast({ title: '当前状态不可发货', icon: 'none' });
      return;
    }
    const expressNo = String(this.data.editingExpressNo || '').trim();
    if (!expressNo) {
      wx.showToast({ title: '请输入快递单号', icon: 'none' });
      return;
    }
    const expressCompany = String(this.data.editingExpressCompany || '').trim();
    this.setData({ operating: true });
    wx.showLoading({ title: '处理中...' });
    api.adminUpdateOrder(d._id, { status: 'shipped', expressCompany, expressNo }).then(res => {
      wx.hideLoading();
      wx.showToast({ title: '已发货' });
      const updated = res.data || {};
      this.setData({ detail: { ...d, ...updated } });
      return this.loadList(true);
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }).finally(() => {
      this.setData({ operating: false });
    });
  },

  markCompleted() {
    const d = this.data.detail || {};
    if (!d._id) return;
    if (this.data.operating) return;
    if (String(d.status) !== 'shipped') {
      wx.showToast({ title: '当前状态不可完成', icon: 'none' });
      return;
    }
    this.setData({ operating: true });
    wx.showLoading({ title: '处理中...' });
    api.adminUpdateOrder(d._id, { status: 'completed' }).then(res => {
      wx.hideLoading();
      wx.showToast({ title: '已完成' });
      const updated = res.data || {};
      this.setData({ detail: { ...d, ...updated } });
      return this.loadList(true);
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }).finally(() => {
      this.setData({ operating: false });
    });
  },

  cancelOrder() {
    const d = this.data.detail || {};
    if (!d._id) return;
    if (this.data.operating) return;
    if (String(d.status) === 'completed') {
      wx.showToast({ title: '订单已完成', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '取消订单',
      content: '确认取消该订单？',
      success: (r) => {
        if (!r.confirm) return;
        this.setData({ operating: true });
        wx.showLoading({ title: '处理中...' });
        api.adminUpdateOrder(d._id, { status: 'cancelled' }).then(res => {
          wx.hideLoading();
          wx.showToast({ title: '已取消' });
          const updated = res.data || {};
          this.setData({ detail: { ...d, ...updated } });
          return this.loadList(true);
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '操作失败', icon: 'none' });
        }).finally(() => {
          this.setData({ operating: false });
        });
      }
    });
  },

  copy(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    wx.setClipboardData({ data: String(text) });
  }
});
