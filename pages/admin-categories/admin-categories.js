const api = require('../../utils/api.js');

Page({
  data: {
    list: [],
    loading: true,
    showEditor: false,
    editingId: '',
    form: {
      name: '',
      icon: '',
      sort: '',
      status: 'on'
    },
    statusOptions: ['启用', '停用'],
    statusIndex: 0
  },

  onLoad() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh());
  },

  stop() { },

  loadList() {
    this.setData({ loading: true });
    return api.adminListCategories().then(res => {
      this.setData({ list: res.data || [], loading: false });
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  openCreate() {
    this.setData({
      showEditor: true,
      editingId: '',
      form: { name: '', icon: '', sort: '', status: 'on' },
      statusIndex: 0
    });
  },

  openEdit(e) {
    const item = e.currentTarget.dataset.item || {};
    const idx = item.status === 'off' ? 1 : 0;
    this.setData({
      showEditor: true,
      editingId: item._id || '',
      form: {
        name: item.name || '',
        icon: item.icon || '',
        sort: String(item.sort || ''),
        status: item.status || 'on'
      },
      statusIndex: idx
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

  onStatusChange(e) {
    const idx = Number(e.detail.value || 0);
    this.setData({
      statusIndex: idx,
      form: { ...this.data.form, status: idx === 1 ? 'off' : 'on' }
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
      icon: String(f.icon || '').trim(),
      sort: Number(f.sort || 0),
      status: String(f.status || 'on')
    };
    wx.showLoading({ title: '保存中...' });
    api.adminUpsertCategory(this.data.editingId || '', data).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已保存' });
      this.closeEditor();
      this.loadList();
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
        api.adminDeleteCategory(id).then(() => {
          wx.hideLoading();
          wx.showToast({ title: '已删除' });
          this.loadList();
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        });
      }
    });
  }
});
