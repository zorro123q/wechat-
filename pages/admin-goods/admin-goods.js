const api = require('../../utils/api.js');

Page({
  data: {
    keyword: '',
    statusOptions: ['全部状态', '上架', '下架'],
    statusIndex: 0,
    status: '',
    categoryOptions: ['全部分类'],
    categoryIds: [''],
    categoryIndex: 0,
    category: '',
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    showEditor: false,
    editingId: '',
    form: {
      name: '',
      points: '',
      stock: '',
      sort: '',
      category: '',
      status: 'on',
      imageUrl: ''
    },
    statusEditOptions: ['上架', '下架'],
    formStatusIndex: 0,
    formCategoryIndex: 0
  },

  onLoad() {
    this.loadCategories().finally(() => this.loadList(true));
  },

  onPullDownRefresh() {
    this.reload();
    wx.stopPullDownRefresh();
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
    const map = ['', 'on', 'off'];
    this.setData({ statusIndex: idx, status: map[idx] || '' });
    this.loadList(true);
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value || 0);
    const id = this.data.categoryIds[idx] || '';
    this.setData({ categoryIndex: idx, category: id });
    this.loadList(true);
  },

  reload() {
    this.loadCategories().finally(() => this.loadList(true));
  },

  loadMore() {
    this.loadList(false);
  },

  loadCategories() {
    return api.adminListCategories().then(res => {
      const rows = res.data || [];
      const options = ['全部分类'].concat(rows.map(c => c.name));
      const ids = [''].concat(rows.map(c => c.name));
      this.setData({ categoryOptions: options, categoryIds: ids });
    }).catch(() => { });
  },

  loadList(refresh) {
    if (this.data.loading) return Promise.resolve();
    const page = refresh ? 1 : this.data.page;
    this.setData({ loading: true });
    return api.adminListGoods({
      page,
      pageSize: this.data.pageSize,
      keyword: this.data.keyword,
      status: this.data.status,
      category: this.data.category
    }).then(res => {
      const rows = res.data || [];
      this.setData({
        list: refresh ? rows : this.data.list.concat(rows),
        page: page + 1,
        hasMore: rows.length >= this.data.pageSize,
        loading: false
      });
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  openCreate() {
    this.setData({
      showEditor: true,
      editingId: '',
      form: {
        name: '',
        points: '',
        stock: '',
        sort: '',
        category: '',
        status: 'on',
        imageUrl: ''
      },
      formStatusIndex: 0,
      formCategoryIndex: 0
    });
  },

  openEdit(e) {
    const item = e.currentTarget.dataset.item || {};
    const statusIndex = item.status === 'off' ? 1 : 0;
    const imageUrl = (item.images && item.images[0]) ? item.images[0] : '';
    const categoryId = item.category || '';
    const idx = Math.max(this.data.categoryIds.indexOf(categoryId), 0);
    this.setData({
      showEditor: true,
      editingId: item._id || '',
      form: {
        name: item.name || '',
        points: String(item.points || ''),
        stock: String(item.stock || ''),
        sort: String(item.sort || ''),
        category: categoryId,
        status: item.status || 'on',
        imageUrl
      },
      formStatusIndex: statusIndex,
      formCategoryIndex: idx
    });
  },

  closeEditor() {
    this.setData({ showEditor: false });
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ form: { ...this.data.form, [field]: value } });
  },

  onFormStatusChange(e) {
    const idx = Number(e.detail.value || 0);
    this.setData({
      formStatusIndex: idx,
      form: { ...this.data.form, status: idx === 1 ? 'off' : 'on' }
    });
  },

  onFormCategoryChange(e) {
    const idx = Number(e.detail.value || 0);
    const id = this.data.categoryIds[idx] || '';
    this.setData({
      formCategoryIndex: idx,
      form: { ...this.data.form, category: id }
    });
  },

  save() {
    const f = this.data.form || {};
    const name = String(f.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }
    const data = {
      name,
      points: Number(f.points || 0),
      stock: Number(f.stock || 0),
      sort: Number(f.sort || 0),
      category: String(f.category || '').trim(),
      status: String(f.status || 'on'),
      imageUrl: String(f.imageUrl || '').trim()
    };
    wx.showLoading({ title: '保存中...' });
    api.adminUpsertGoods(this.data.editingId || '', data).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已保存' });
      try {
        wx.setStorageSync('goodsUpdatedAt', Date.now());
      } catch (_) { }
      this.closeEditor();
      this.loadList(true);
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: (r) => {
        if (!r.confirm) return;
        wx.showLoading({ title: '删除中...' });
        api.adminDeleteGoods(id).then(() => {
          wx.hideLoading();
          wx.showToast({ title: '已删除' });
          try {
            wx.setStorageSync('goodsUpdatedAt', Date.now());
          } catch (_) { }
          this.loadList(true);
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        });
      }
    });
  }
});
