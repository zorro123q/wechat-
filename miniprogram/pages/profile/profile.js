// profile.js
const app = getApp();
const api = require('../../utils/api.js');
const { formatPoints, maskPhone } = require('../../utils/format.js');

Page({
  data: {
    userInfo: {},
    levels: [],
    isAdmin: false,
    showLevelModal: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
    this.checkAdmin();
  },

  onPullDownRefresh() {
    this.initPage().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  initPage() {
    return Promise.all([
      this.loadUserInfo(),
      this.loadLevels(),
      this.checkAdmin()
    ]);
  },

  // 加载用户信息
  loadUserInfo() {
    return api.getUserInfo().then(userInfo => {
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      this.setData({
        userInfo,
        // 在这里直接格式化数据
        formattedAvailablePoints: formatPoints(userInfo.points),
        formattedTotalPoints: formatPoints(userInfo.totalPoints)
      });
      // 同步获取最高证书名称与等级用于头部展示（颜色随证书等级）
      return api.getUserPublic().then(res => {
        const topCert = res.result && res.result.userPublic && res.result.userPublic.topCertificate
          ? res.result.userPublic.topCertificate
          : null;
        const topCertName = topCert ? (topCert.certName || '') : '';
        // 去掉尾部“证书/认证”字样，保留“高级训机师”等称谓
        const displayName = topCertName.replace(/(证书|认证)$/, '');
        // 根据数值等级映射到样式key
        let topCertLevelKey = '';
        if (topCert && typeof topCert.level === 'number') {
          if (topCert.level >= 3) topCertLevelKey = 'senior';
          else if (topCert.level === 2) topCertLevelKey = 'intermediate';
          else topCertLevelKey = 'junior';
        }
        this.setData({ topCertName: displayName, topCertLevelKey });
      }).catch(() => {
        // 忽略失败，维持等级徽标回退
      });
    }).catch(err => {
      console.error('加载用户信息失败', err);
    });
  },

  // 获取等级名称
  getLevelName(levelKey) {
    const levelNames = {
      'junior': '初级训机师',
      'intermediate': '中级训机师',
      'senior': '高级训机师'
    };
    return levelNames[levelKey] || '初级训机师';
  },

  // 加载等级配置
  loadLevels() {
    return api.getLevels().then(res => {
      this.setData({ levels: res.data });
    }).catch(err => {
      console.error('加载等级配置失败', err);
      this.setData({
        levels: [
          { key: 'junior', name: '初级训机师' },
          { key: 'intermediate', name: '中级训机师' },
          { key: 'senior', name: '高级训机师' }
        ]
      });
    });
  },

  // 检查是否是管理员
  checkAdmin() {
    return api.checkAdmin().then(isAdmin => {
      this.setData({ isAdmin });
      return isAdmin;
    }).catch(err => {
      console.error('检查管理员权限失败', err);
      this.setData({ isAdmin: false });
      return false;
    });
  },

  dailyCheckIn() {
    wx.showLoading({ title: '签到中...' });
    api.dailyCheckIn().then(res => {
      wx.hideLoading();
      const result = (res && res.result) || {};
      if (result.success) {
        const addedPoints = Number(result.addedPoints || 0);
        if (result.alreadyCheckedIn || addedPoints <= 0) {
          wx.showToast({ title: '今天已签到', icon: 'none' });
        } else {
          wx.showToast({ title: `+${addedPoints} 积分` });
        }
        this.loadUserInfo();
      } else {
        const msg = String(result.message || '');
        if (msg.includes('duplicate') || msg.includes('conflict') || msg.includes('已存在') || msg.includes('重复')) {
          wx.showToast({ title: '今天已签到', icon: 'none' });
        } else {
          wx.showToast({ title: result.message || '签到失败', icon: 'none' });
        }
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '今天已签到', icon: 'none' });
    });
  },

  // 跳转积分明细
  goToPointsDetail() {
    wx.navigateTo({
      url: '/pages/points-detail/points-detail'
    });
  },

  // 跳转兑换记录
  goToExchangeRecords() {
    wx.navigateTo({
      url: '/pages/exchange-records/exchange-records'
    });
  },

  // 跳转地址管理
  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  goToProfileEdit() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit'
    });
  },

  // 跳转我的证书
  goToMyCertificates() {
    wx.navigateTo({
      url: '/pages/my-certificates/my-certificates'
    });
  },

  // 跳转管理后台
  goToAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  

  // 显示等级说明
  showLevelGuide() {
    this.setData({ showLevelModal: true });
  },

  // 隐藏等级说明
  hideLevelGuide() {
    this.setData({ showLevelModal: false });
  },

  // 阻止冒泡
  stopPropagation() {
    // do nothing
  },

  // 格式化积分
  formatPoints(points) {
    return formatPoints(points || 0);
  },

  // 脱敏手机号
  maskPhone(phone) {
    return maskPhone(phone);
  },

  // 每日签到
  dailyCheckIn() {
    this.setData({ isCheckingIn: true });

    wx.cloud.callFunction({
      name: 'dailyCheckIn'
    }).then(res => {
      this.setData({ isCheckingIn: false });
      
      if (res.result && res.result.success) {
        const addedPoints = res.result.data && res.result.data.addedPoints || 100;
        wx.showToast({
          title: `签到成功，+${addedPoints}积分`,
          icon: 'success'
        });
        // 更新签到状态和积分
        this.setData({ hasCheckedIn: true });
        // 重新加载用户信息，更新积分
        this.loadUserInfo();
      } else {
        wx.showToast({
          title: res.result.message || '签到失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ isCheckingIn: false });
      console.error('签到失败', err);
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  },

  // 跳转升级权限预览
  goToUpgradePreview() {
    console.log('触发升级权限预览跳转');
    wx.navigateTo({
      url: '/pages/upgradePreview/upgradePreview',
      fail: (err) => {
        console.error('跳转升级权限预览页失败：', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  },

  // 分享生成海报
  generatePoster() {
    wx.showLoading({ title: '生成海报中...' });
    
    // 1. 先获取用户信息
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.hideLoading();
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    // 2. 模拟获取小程序码（实际项目中应调用后端接口）
    const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https://example.com/register?referral=' + (userInfo._id || '');
    
    // 3. 创建 canvas 并绘制海报
    const ctx = wx.createCanvasContext('posterCanvas');
    
    // 设置画布背景为白色
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, 400, 533);
    
    // 绘制用户头像
    const avatarUrl = userInfo.avatar || '/images/default-avatar.png';
    ctx.save();
    ctx.beginPath();
    ctx.arc(200, 80, 50, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(avatarUrl, 150, 30, 100, 100);
    ctx.restore();
    
    // 绘制用户昵称
    ctx.setFontSize(20);
    ctx.setFillStyle('#000000');
    ctx.setTextAlign('center');
    ctx.fillText(userInfo.name || '未设置姓名', 200, 170);
    
    // 绘制邀请文案
    ctx.setFontSize(18);
    ctx.setFillStyle('#666666');
    ctx.fillText('邀请您加入科讯嘉联训机师学苑', 200, 210);
    
    // 绘制小程序码
    wx.getImageInfo({
      src: qrCodeUrl,
      success: (res) => {
        ctx.drawImage(res.path, 100, 240, 200, 200);
        
        // 绘制扫码提示
        ctx.setFontSize(16);
        ctx.setFillStyle('#999999');
        ctx.fillText('扫描二维码加入', 200, 460);
        
        // 完成绘制
        ctx.draw(false, () => {
          // 生成临时图片
          wx.canvasToTempFilePath({
            canvasId: 'posterCanvas',
            success: (res) => {
              wx.hideLoading();
              // 显示海报弹窗
              this.setData({
                showPosterModal: true,
                posterImage: res.tempFilePath
              });
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('生成图片失败', err);
              wx.showToast({ title: '生成图片失败', icon: 'none' });
            }
          });
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取二维码失败', err);
        wx.showToast({ title: '获取二维码失败', icon: 'none' });
      }
    });
  },

  // 隐藏海报弹窗
  hidePosterModal() {
    this.setData({ showPosterModal: false });
  },

  // 保存海报到相册
  savePoster() {
    const { posterImage } = this.data;
    if (!posterImage) {
      wx.showToast({ title: '海报未生成', icon: 'none' });
      return;
    }
    
    // 申请保存到相册权限
    wx.getSetting({
      success: (settingRes) => {
        if (!settingRes.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              this.saveImageToAlbum(posterImage);
            },
            fail: () => {
              wx.showToast({ title: '需要授权才能保存到相册', icon: 'none' });
            }
          });
        } else {
          this.saveImageToAlbum(posterImage);
        }
      }
    });
  },

  // 保存图片到相册的函数
  saveImageToAlbum(tempFilePath) {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        wx.showToast({ title: '保存成功', icon: 'success' });
      },
      fail: (err) => {
        console.error('保存到相册失败', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  // 分享到朋友圈
  shareToMoments() {
    const { posterImage } = this.data;
    if (!posterImage) {
      wx.showToast({ title: '海报未生成', icon: 'none' });
      return;
    }
    
    // 先保存图片到相册，然后提示用户手动分享
    this.saveImageToAlbum(posterImage);
    setTimeout(() => {
      wx.showModal({
        title: '分享到朋友圈',
        content: '图片已保存到相册，请打开朋友圈手动分享',
        showCancel: false
      });
    }, 1000);
  },
  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-xxx-xxxx\n工作时间：9:00-18:00',
      showCancel: false
    });
  },

  generatePromoCode() {
    const user = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    const referralCode = user.referralCode || '';
    if (!referralCode) {
      wx.showToast({ title: '暂无推荐码', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '生成中...' });
    api.generateMiniProgramCode({
      referralCode,
      width: 430,
      returnType: 'file'
    }).then(res => {
      wx.hideLoading();
      const r = res && res.result;
      if (!r || !r.success) {
        wx.showToast({ title: (r && r.message) || '生成失败', icon: 'none' });
        return;
      }

      if (r.fileID) {
        wx.navigateTo({
          url: `/pages/promo-code/promo-code?fileID=${encodeURIComponent(r.fileID)}&temp=${encodeURIComponent(r.tempFileURL || '')}`
        });
        return;
      }

      if (r.tempFileURL) {
        wx.navigateTo({
          url: `/pages/promo-code/promo-code?temp=${encodeURIComponent(r.tempFileURL)}`
        });
        return;
      }

      wx.showToast({ title: '生成失败', icon: 'none' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    });
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '科讯嘉联训机师学苑\n积分管理平台 v1.0.0',
      showCancel: false
    });
  }
});
