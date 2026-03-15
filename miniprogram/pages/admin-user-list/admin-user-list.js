const api = require('../../utils/api.js');

Page({
  data: {
    keyword: '',
    level: '',
    levelOptions: ['全部', '初级', '中级', '高级'],
    levelIndex: 0,
    levelLabel: '全部',
    page: 1,
    pageSize: 20,
    list: [],
    hasMore: true,
    loading: false,
    showDetail: false,
    detailUser: {},
    exporting: false
  },

  onLoad() {
    this.loadList(true);
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(false);
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    this.loadList(true);
  },

  onLevelChange(e) {
    const idx = Number(e.detail.value || 0);
    const map = ['', 'junior', 'intermediate', 'senior'];
    this.setData({
      levelIndex: idx,
      levelLabel: this.data.levelOptions[idx],
      level: map[idx]
    });
    this.loadList(true);
  },

  loadList(refresh = false) {
    if (this.data.loading) return Promise.resolve();
    const page = refresh ? 1 : this.data.page;
    this.setData({ loading: true });
    return api.adminListUsers({
      page,
      pageSize: this.data.pageSize,
      keyword: this.data.keyword,
      level: this.data.level
    }).then(res => {
      const r = res.result || {};
      if (r.success === false) {
        this.setData({ loading: false });
        wx.showModal({
          title: '无权限',
          content: r.message || '无权限',
          showCancel: false,
          success: () => wx.navigateBack()
        });
        return;
      }
      const rows = r.list || [];
      this.setData({
        list: refresh ? rows : this.data.list.concat(rows),
        page: page + 1,
        hasMore: (rows.length >= this.data.pageSize),
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  loadMore() {
    this.loadList(false);
  },

  showDetail(e) {
    const { user } = e.currentTarget.dataset;
    this.setData({
      showDetail: true,
      detailUser: user || {}
    });
  },

  hideDetail() {
    this.setData({
      showDetail: false,
      detailUser: {}
    });
  },

  stopPropagation() { },

  exportUsers() {
    if (this.data.exporting) return;

    this.setData({ exporting: true });
    wx.showLoading({ title: '导出中...' });

    const pageSize = 100;
    const maxRows = 2000;

    const fetchAll = async () => {
      let page = 1;
      let rows = [];
      while (true) {
        const res = await api.adminListUsers({
          page,
          pageSize,
          keyword: this.data.keyword,
          level: this.data.level
        });
        const r = res.result || {};
        if (r.success === false) {
          throw new Error(r.message || '无权限');
        }
        const part = r.list || [];
        rows = rows.concat(part);
        if (rows.length >= maxRows) break;
        if (part.length < pageSize) break;
        page += 1;
      }
      return rows.slice(0, maxRows);
    };

    const escapeCsv = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      const need = s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r');
      const fixed = s.replace(/"/g, '""');
      return need ? `"${fixed}"` : fixed;
    };

    fetchAll().then(rows => {
      const header = [
        'name', 'phone', 'level', 'points', 'totalPoints', 'school', 'degree', 'company', 'role', 'experience', 'trainingIntention', 'idCard', 'referralCode', 'createTime'
      ];
      const lines = [header.join(',')];
      rows.forEach(u => {
        lines.push([
          escapeCsv(u.name),
          escapeCsv(u.phone),
          escapeCsv(u.level),
          escapeCsv(u.points),
          escapeCsv(u.totalPoints),
          escapeCsv(u.school),
          escapeCsv(u.degree),
          escapeCsv(u.company),
          escapeCsv(u.role),
          escapeCsv(u.experience),
          escapeCsv(u.trainingIntention),
          escapeCsv(u.idCard),
          escapeCsv(u.referralCode),
          escapeCsv(u.createTime)
        ].join(','));
      });
      const csv = lines.join('\n');

      wx.setClipboardData({
        data: csv,
        success: () => {
          wx.hideLoading();
          wx.showToast({ title: `已复制 ${rows.length} 条` });
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '数据过大，复制失败', icon: 'none' });
        }
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '导出失败', icon: 'none' });
    }).finally(() => {
      this.setData({ exporting: false });
    });
  }
});
