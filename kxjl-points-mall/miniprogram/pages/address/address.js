// address.js
const api = require('../../utils/api.js');

Page({
  data: {
    addressList: [],
    isSelectMode: false,
    loading: false,
    showEditModal: false,
    editingId: null,
    region: [],
    editForm: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false
    }
  },

  onLoad(options) {
    this.setData({
      isSelectMode: options.select === '1'
    });
    this.loadAddresses();
  },

  // 加载地址列表
  loadAddresses() {
    this.setData({ loading: true });
    api.getAddresses().then(res => {
      this.setData({
        addressList: res.data,
        loading: false
      });
    }).catch(err => {
      console.error('加载地址失败', err);
      this.setData({ loading: false });
    });
  },

  // 选择地址（选择模式下）
  selectAddress(e) {
    if (!this.data.isSelectMode) return;

    const { address } = e.currentTarget.dataset;
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      prevPage.setData({ address });
    }
    wx.navigateBack();
  },

  // 添加地址
  addAddress() {
    this.setData({
      editingId: null,
      region: [],
      editForm: {
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        isDefault: false
      },
      showEditModal: true
    });
  },

  // 编辑地址
  editAddress(e) {
    const { id, address } = e.currentTarget.dataset;
    this.setData({
      editingId: id,
      region: [address.province, address.city, address.district],
      editForm: {
        name: address.name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail: address.detail,
        isDefault: address.isDefault
      },
      showEditModal: true
    });
  },

  // 隐藏编辑弹窗
  hideEditModal() {
    this.setData({ showEditModal: false });
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({
      'editForm.name': e.detail.value
    });
  },

  // 手机输入
  onPhoneInput(e) {
    this.setData({
      'editForm.phone': e.detail.value
    });
  },

  // 地区选择
  onRegionChange(e) {
    const [province, city, district] = e.detail.value;
    this.setData({
      region: e.detail.value,
      'editForm.province': province,
      'editForm.city': city,
      'editForm.district': district
    });
  },

  // 详细地址输入
  onDetailInput(e) {
    this.setData({
      'editForm.detail': e.detail.value
    });
  },

  // 默认地址开关
  onDefaultSwitch(e) {
    this.setData({
      'editForm.isDefault': e.detail.value
    });
  },

  // 保存地址
  saveAddress() {
    const { editForm, editingId, addressList } = this.data;

    if (!editForm.name) {
      wx.showToast({
        title: '请输入收货人姓名',
        icon: 'none'
      });
      return;
    }
    if (!editForm.phone || editForm.phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    if (!editForm.province || !editForm.city || !editForm.district) {
      wx.showToast({
        title: '请选择所在地区',
        icon: 'none'
      });
      return;
    }
    if (!editForm.detail) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    // 如果设为默认，先取消其他地址的默认状态
    if (editForm.isDefault) {
      const defaultAddress = addressList.find(addr => addr.isDefault && addr._id !== editingId);
      if (defaultAddress) {
        api.updateAddress(defaultAddress._id, { isDefault: false }).catch(err => {
          console.error('取消默认地址失败', err);
        });
      }
    }

    const promise = editingId
      ? api.updateAddress(editingId, editForm)
      : api.addAddress(editForm);

    promise.then(() => {
      wx.hideLoading();
      this.hideEditModal();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      this.loadAddresses();
    }).catch(err => {
      wx.hideLoading();
      console.error('保存地址失败', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    });
  },

  // 设为默认
  setDefault(e) {
    const { id } = e.currentTarget.dataset;
    const { addressList } = this.data;

    wx.showLoading({ title: '设置中...' });

    // 先取消其他地址的默认状态
    const promises = [];
    const defaultAddress = addressList.find(addr => addr.isDefault);
    if (defaultAddress) {
      promises.push(api.updateAddress(defaultAddress._id, { isDefault: false }));
    }
    promises.push(api.updateAddress(id, { isDefault: true }));

    Promise.all(promises).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '设置成功',
        icon: 'success'
      });
      this.loadAddresses();
    }).catch(err => {
      wx.hideLoading();
      console.error('设置默认地址失败', err);
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      });
    });
  },

  // 删除地址
  deleteAddress(e) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          api.deleteAddress(id).then(() => {
            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadAddresses();
          }).catch(err => {
            wx.hideLoading();
            console.error('删除地址失败', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  // 阻止冒泡
  stopPropagation() {
    // do nothing
  }
});
