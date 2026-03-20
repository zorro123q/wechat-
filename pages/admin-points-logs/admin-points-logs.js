const api = require('../../utils/api.js');
const { formatTime } = require('../../utils/format.js');

Page({
  data: {
    keyword: '',
    typeOptions: ['全部', '获取', '消耗'],
    typeIndex: 0,
    type: '',
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false
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

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onTypeChange(e) {
    const idx = Number(e.detail.value || 0);
    const map = ['', 'earn', 'spend'];
    this.setData({ typeIndex: idx, type: map[idx] || '' });
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
    return api.adminListPointsLogs({
      page,
      pageSize: this.data.pageSize,
      type: this.data.type,
      keyword: String(this.data.keyword || '').trim()
    }).then(res => {
      const rows = (res.data || []).map(r => ({
        ...r,
        formattedTime: formatTime(r.createTime, 'YYYY-MM-DD HH:mm')
      }));
      this.setData({
        list: refresh ? rows : this.data.list.concat(rows),
        page: page + 1,
        hasMore: rows.length >= this.data.pageSize,
        loading: false
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
  }
});
