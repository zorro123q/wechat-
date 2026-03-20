const app = getApp();

Page({
  data: {
    activeTab: 'code',
    passwordMode: 'login',
    phone: '',
    code: '',
    password: '',
    countdown: 0,
    timer: null,
    isSending: false,
    isLogging: false,
    agree: true
  },

  onShow() {
    try {
      if (wx.hideHomeButton) wx.hideHomeButton();
    } catch (_) { }
    if (app.globalData.hasLogin) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, code: '', password: '' });
  },

  switchPasswordMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.passwordMode) return;
    this.setData({ passwordMode: mode, password: '' });
  },

  onPhoneInput(e) {
    this.setData({ phone: String(e.detail.value || '').trim() });
  },

  onCodeInput(e) {
    this.setData({ code: String(e.detail.value || '').trim() });
  },

  onPasswordInput(e) {
    this.setData({ password: String(e.detail.value || '') });
  },

  onAgreeChange(e) {
    const values = (e.detail && e.detail.value) || [];
    this.setData({ agree: values.includes('agree') });
  },

  validatePhone() {
    const phone = this.data.phone;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return false;
    }
    return true;
  },

  sendCode() {
    if (!this.validatePhone()) return;
    if (this.data.isSending || this.data.countdown > 0) return;

    const envVersion = (wx.getAccountInfoSync && wx.getAccountInfoSync().miniProgram && wx.getAccountInfoSync().miniProgram.envVersion) || 'release';
    const debug = envVersion !== 'release';

    this.setData({ isSending: true });
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'sendCode',
        phone: this.data.phone,
        debug
      }
    }).then(res => {
      this.setData({ isSending: false });
      if (res.result && res.result.success) {
        wx.showToast({ title: '验证码已发送', icon: 'success' });
        if (debug && res.result.debugCode) {
          wx.showModal({
            title: '开发模式验证码',
            content: `验证码：${res.result.debugCode}`,
            showCancel: false
          });
        }
        this.startCountdown(60);
      } else {
        wx.showToast({ title: (res.result && res.result.message) || '发送失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ isSending: false });
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    });
  },

  startCountdown(seconds) {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    this.setData({ countdown: seconds });
    const timer = setInterval(() => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        clearInterval(timer);
        this.setData({ countdown: 0, timer: null });
      } else {
        this.setData({ countdown: next });
      }
    }, 1000);
    this.setData({ timer });
  },

  submit() {
    if (!this.data.agree) {
      wx.showToast({ title: '请先同意服务协议', icon: 'none' });
      return;
    }
    if (!this.validatePhone()) return;
    if (this.data.isLogging) return;

    if (this.data.activeTab === 'code') {
      const code = this.data.code;
      if (!/^\d{6}$/.test(code)) {
        wx.showToast({ title: '请输入 6 位验证码', icon: 'none' });
        return;
      }
      this.loginByCode();
      return;
    }

    const password = this.data.password;
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' });
      return;
    }
    if (this.data.passwordMode === 'register') {
      this.registerByPassword();
      return;
    }
    this.loginByPassword();
  },

  loginByCode() {
    this.setData({ isLogging: true });
    const envVersion = (wx.getAccountInfoSync && wx.getAccountInfoSync().miniProgram && wx.getAccountInfoSync().miniProgram.envVersion) || 'release';
    const debug = envVersion !== 'release';
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'verifyCode',
        phone: this.data.phone,
        code: this.data.code,
        debug
      }
    }).then(res => {
      this.setData({ isLogging: false });
      if (res.result && res.result.success) {
        const { token, userInfo, isNewUser } = res.result;
        wx.setStorageSync('authToken', token);
        wx.setStorageSync('userId', userInfo && userInfo._id);
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.token = token;
        app.globalData.userId = userInfo && userInfo._id;
        app.globalData.userInfo = userInfo;
        app.globalData.hasLogin = true;
        const isComplete = app.isRegistrationComplete ? app.isRegistrationComplete(userInfo) : true;
        if (isNewUser || !isComplete) {
          wx.showModal({
            title: '完善资料',
            content: '登录成功，请先完善个人信息。',
            showCancel: false,
            confirmText: '去完善',
            success: () => {
              const extra = isNewUser ? '?requirePassword=1&force=1' : '';
              wx.navigateTo({ url: `/pages/register/register${extra}` });
            }
          });
          return;
        }

        wx.switchTab({ url: '/pages/index/index' });
      } else {
        wx.showToast({ title: (res.result && res.result.message) || '登录失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ isLogging: false });
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    });
  },

  registerByPassword() {
    this.setData({ isLogging: true });
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'passwordRegister',
        phone: this.data.phone,
        password: this.data.password
      }
    }).then(res => {
      this.setData({ isLogging: false });
      if (res.result && res.result.success) {
        const { token, userInfo } = res.result;
        wx.setStorageSync('authToken', token);
        wx.setStorageSync('userId', userInfo && userInfo._id);
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.token = token;
        app.globalData.userId = userInfo && userInfo._id;
        app.globalData.userInfo = userInfo;
        app.globalData.hasLogin = true;
        wx.showModal({
          title: '完善资料',
          content: '注册成功，请先完善个人信息。',
          showCancel: false,
          confirmText: '去完善',
          success: () => {
            wx.navigateTo({ url: '/pages/register/register?force=1' });
          }
        });
      } else {
        wx.showToast({ title: (res.result && res.result.message) || '注册失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ isLogging: false });
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    });
  }

  ,

  loginByPassword() {
    this.setData({ isLogging: true });
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'passwordLogin',
        phone: this.data.phone,
        password: this.data.password
      }
    }).then(res => {
      this.setData({ isLogging: false });
      if (res.result && res.result.success) {
        const { token, userInfo } = res.result;
        wx.setStorageSync('authToken', token);
        wx.setStorageSync('userId', userInfo && userInfo._id);
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.token = token;
        app.globalData.userId = userInfo && userInfo._id;
        app.globalData.userInfo = userInfo;
        app.globalData.hasLogin = true;
        const isComplete = app.isRegistrationComplete ? app.isRegistrationComplete(userInfo) : true;
        if (!isComplete) {
          wx.showModal({
            title: '完善资料',
            content: '登录成功，请先完善个人信息。',
            showCancel: false,
            confirmText: '去完善',
            success: () => {
              wx.navigateTo({ url: '/pages/register/register?force=1' });
            }
          });
          return;
        }
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        wx.showToast({ title: (res.result && res.result.message) || '登录失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ isLogging: false });
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    });
  },

  contactService() {
    const phone = '400-xxx-xxxx';
    wx.showActionSheet({
      itemList: ['拨打电话', '复制号码'],
      success: (res) => {
        const tapIndex = res && typeof res.tapIndex === 'number' ? res.tapIndex : -1;
        if (tapIndex === 0) {
          wx.makePhoneCall({ phoneNumber: phone });
          return;
        }
        if (tapIndex === 1) {
          wx.setClipboardData({ data: phone });
        }
      }
    });
  }
});
