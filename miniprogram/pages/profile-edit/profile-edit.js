const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    form: {
      school: '',
      degree: '',
      phone: '',
      company: '',
      role: '',
      experience: '',
      trainingIntention: '',
      idCard: '',
      referralCode: ''
    },
    saving: false
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || {};
    this.setData({
      form: {
        school: userInfo.school || '',
        degree: userInfo.degree || '',
        phone: userInfo.phone || '',
        company: userInfo.company || '',
        role: userInfo.role || '',
        experience: userInfo.experience || '',
        trainingIntention: userInfo.trainingIntention || '',
        idCard: userInfo.idCard || '',
        referralCode: userInfo.referralCode || ''
      }
    });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: e.detail.value
    });
  },

  onSave() {
    if (this.data.saving) return;

    const userInfo = app.globalData.userInfo || {};
    if (!userInfo._id) {
      wx.showToast({
        title: '用户信息缺失',
        icon: 'none'
      });
      return;
    }

    const form = this.data.form;
    const phone = (form.phone || '').trim();
    if (phone && !/^\d{11}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    api.updateUserProfile(userInfo._id, {
      school: form.school || '',
      degree: form.degree || '',
      phone: phone,
      company: form.company || '',
      role: form.role || '',
      experience: form.experience || '',
      trainingIntention: form.trainingIntention || '',
      idCard: form.idCard || ''
    }).then(() => {
      return api.getUserInfo();
    }).then(freshUserInfo => {
      app.globalData.userInfo = freshUserInfo;
      wx.setStorageSync('userInfo', freshUserInfo);

      wx.hideLoading();
      wx.showToast({ title: '保存成功' });
      setTimeout(() => {
        wx.navigateBack();
      }, 600);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ saving: false });
    });
  },

  copyReferralCode() {
    const code = (this.data.form && this.data.form.referralCode) || '';
    if (!code) {
      wx.showToast({ title: '暂无推荐码', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: code
    });
  }
});
