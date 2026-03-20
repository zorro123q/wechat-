// register.js
Page({
  data: {
    formData: {
      name: '',
      phone: '',
      school: '',
      education: 0,
      company: '',
      position: '',
      workYears: '',
      isTrained: 0,
      idCard: '',
      recommendCode: ''
    },
    educationOptions: ['高中及以下', '大专', '本科', '硕士', '博士'],
    trainingOptions: ['否', '是'],
    isRecommendCodeDisabled: false,
    isSubmitting: false
  },

  onLoad(options) {
    // 解析场景参数
    this.parseScene(options.scene);
  },

  // 解析场景参数
  parseScene(scene) {
    if (!scene) return;

    try {
      // 解码scene参数
      const decodedScene = decodeURIComponent(scene);
      // 解析推荐码
      const params = new URLSearchParams(decodedScene);
      const recommendCode = params.get('recommendCode');

      if (recommendCode) {
        // 填充推荐码并禁用输入框
        this.setData({
          'formData.recommendCode': recommendCode,
          isRecommendCodeDisabled: true
        });
      }
    } catch (error) {
      console.error('解析场景参数失败', error);
    }
  },

  // 处理输入事件
  handleInput(e) {
    const name = e.currentTarget.dataset.name || e.currentTarget.name;
    const value = e.detail.value;
    this.setData({
      [`formData.${name}`]: value
    });
  },

  // 处理选择器变化
  handlePickerChange(e) {
    const { name } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.${name}`]: value
    });
  },

  // 表单校验
  validateForm() {
    const { formData } = this.data;
    const requiredFields = [
      { key: 'name', label: '姓名' },
      { key: 'phone', label: '手机号' },
      { key: 'school', label: '学校' },
      { key: 'company', label: '公司' },
      { key: 'position', label: '岗位' },
      { key: 'workYears', label: '工作年限' }
    ];

    // 校验必填项
    for (const field of requiredFields) {
      if (!formData[field.key]) {
        wx.showToast({
          title: `请填写${field.label}`,
          icon: 'none'
        });
        return false;
      }
    }

    // 校验手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return false;
    }

    // 校验工作年限
    if (!formData.workYears || isNaN(formData.workYears) || formData.workYears < 0) {
      wx.showToast({
        title: '工作年限格式不正确',
        icon: 'none'
      });
      return false;
    }

    // 校验身份证格式（如果填写）
    if (formData.idCard) {
      const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
      if (!idCardRegex.test(formData.idCard)) {
        wx.showToast({
          title: '身份证格式不正确',
          icon: 'none'
        });
        return false;
      }
    }

    return true;
  },

  // 提交表单
  submitForm() {
    // 校验表单
    if (!this.validateForm()) {
      return;
    }

    // 显示加载状态
    this.setData({ isSubmitting: true });

    // 调用注册云函数
    wx.cloud.callFunction({
      name: 'register',
      data: this.data.formData
    }).then(res => {
      this.setData({ isSubmitting: false });
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '注册失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ isSubmitting: false });
      console.error('注册失败', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  }
});