// API 封装

const db = wx.cloud.database();
const _ = db.command;

/**
 * 获取用户信息
 * 如果本地没有，则调用云函数登录/注册
 * @returns {Promise}
 */
function getUserInfo() {
  return new Promise((resolve, reject) => {
    db.collection('users').get().then(res => {
      if (res.data && res.data.length > 0) {
        // 用户已存在，直接返回
        resolve(res.data[0]);
      } else {
        // 用户不存在，调用登录云函数进行注册
        wx.cloud.callFunction({
          name: 'login'
        }).then(loginRes => {
          if (loginRes.result && loginRes.result.success) {
            resolve(loginRes.result.userInfo);
          } else {
            reject(new Error('登录失败'));
          }
        }).catch(err => {
          console.error('调用登录云函数失败', err);
          reject(new Error('登录失败'));
        });
      }
    }).catch(err => {
      console.error('查询用户信息失败', err);
      reject(new Error('获取用户信息失败'));
    });
  });
}

/**
 * 获取等级配置
 * @returns {Promise}
 */
function getLevels() {
  return db.collection('levels')
    .orderBy('minPoints', 'asc')
    .get();
}

/**
 * 获取积分明细
 * @param {object} params 查询参数
 * @returns {Promise}
 */
function getPointsLogs(params = {}) {
  const { type, page = 1, pageSize = 20 } = params;
  const openid = wx.getStorageSync('openid');
  let query = db.collection('points_logs');

  const where = {};
  if (openid) where._openid = openid;
  if (type) where.type = type;
  if (Object.keys(where).length > 0) query = query.where(where);

  return query
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
}

/**
 * 获取商品列表
 * @param {object} params 查询参数
 * @returns {Promise}
 */
function getGoods(params = {}) {
  const { category, keyword, page = 1, pageSize = 20 } = params;
  const where = { status: 'on' };
  if (category) where.category = category;
  if (keyword) {
    where.name = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  const query = db.collection('goods').where(where);

  return query
    .orderBy('sort', 'asc')
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
}

/**
 * 获取商品详情
 * @param {string} id 商品ID
 * @returns {Promise}
 */
function getGoodsDetail(id) {
  return db.collection('goods').doc(id).get();
}

/**
 * 获取商品分类
 * @returns {Promise}
 */
function getCategories() {
  return db.collection('categories')
    .orderBy('sort', 'asc')
    .get();
}

/**
 * 兑换商品
 * @param {object} data 兑换数据
 * @returns {Promise}
 */
function exchangeGoods(data) {
  return wx.cloud.callFunction({
    name: 'exchange',
    data
  });
}

/**
 * 获取订单列表
 * @param {object} params 查询参数
 * @returns {Promise}
 */
function getOrders(params = {}) {
  const { status, page = 1, pageSize = 20 } = params;
  let query = db.collection('orders');

  if (status) {
    query = query.where({ status });
  }

  return query
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
}

/**
 * 获取订单详情
 * @param {string} id 订单ID
 * @returns {Promise}
 */
function getOrderDetail(id) {
  return db.collection('orders').doc(id).get();
}

/**
 * 获取地址列表
 * @returns {Promise}
 */
function getAddresses() {
  return db.collection('addresses')
    .orderBy('isDefault', 'desc')
    .orderBy('createTime', 'desc')
    .get();
}

/**
 * 添加地址
 * @param {object} data 地址数据
 * @returns {Promise}
 */
function addAddress(data) {
  return db.collection('addresses').add({
    data: {
      ...data,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
}

/**
 * 更新地址
 * @param {string} id 地址ID
 * @param {object} data 地址数据
 * @returns {Promise}
 */
function updateAddress(id, data) {
  return db.collection('addresses').doc(id).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  });
}

/**
 * 删除地址
 * @param {string} id 地址ID
 * @returns {Promise}
 */
function deleteAddress(id) {
  return db.collection('addresses').doc(id).remove();
}

/**
 * 获取默认地址
 * @returns {Promise}
 */
function getDefaultAddress() {
  return db.collection('addresses')
    .where({ isDefault: true })
    .limit(1)
    .get();
}

/**
 * 获取公告列表
 * @returns {Promise}
 */
function getNotices() {
  return db.collection('notices')
    .where({ status: 'on' })
    .orderBy('sort', 'asc')
    .orderBy('createTime', 'desc')
    .limit(10)
    .get();
}

/**
 * 检查是否为管理员（调用云函数）
 * @returns {Promise<boolean>}
 */
function checkAdmin() {
  return wx.cloud.callFunction({
    name: 'checkAdmin'
  }).then(res => {
    if (res.result && res.result.success) {
      return res.result.isAdmin;
    } else {
      return false;
    }
  }).catch(() => {
    return false; // 调用失败也认为不是管理员
  });
}

/**
 * 管理员发放积分
 * @param {object} data 发放数据
 * @returns {Promise}
 */
function adminGrantPoints(data) {
  return wx.cloud.callFunction({
    name: 'adminGrantPoints',
    data
  });
}

/**
 * 核销订单
 * @param {string} exchangeCode 兑换码
 * @returns {Promise}
 */
function verifyOrder(exchangeCode) {
  return wx.cloud.callFunction({
    name: 'verifyOrder',
    data: { exchangeCode }
  });
}

function dailyCheckIn() {
  return wx.cloud.callFunction({
    name: 'dailyCheckIn'
  });
}

/**
 * 注册接口（表单落库 + 引荐奖励）
 * @param {object} data 表单数据
 */
function register(data) {
  return wx.cloud.callFunction({
    name: 'register',
    data
  });
}

/**
 * 获取用户公用信息（脱敏）+ 最高证书
 * @param {object} params { userId?, targetOpenid? }
 */
function getUserPublic(params = {}) {
  return wx.cloud.callFunction({
    name: 'getUserPublic',
    data: params
  });
}

function adminListUsers(params = {}) {
  return wx.cloud.callFunction({
    name: 'adminListUsers',
    data: params
  });
}

function generateMiniProgramCode(params = {}) {
  return wx.cloud.callFunction({
    name: 'generateMiniProgramCode',
    data: params
  });
}

/**
 * 搜索学员
 * @param {string} keyword 关键词
 * @returns {Promise}
 */
function searchUsers(keyword) {
  return db.collection('users')
    .where({
      name: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    })
    .limit(20)
    .get();
}

/**
 * 获取用户证书
 */
const getCertificates = () => {
  return db.collection('certificates').orderBy('issueDate', 'desc').get();
};

function updateUserProfile(userId, data = {}) {
  return db.collection('users').doc(userId).update({
    data: {
      ...data,
      updateTime: db.serverDate()
    }
  });
}

module.exports = {
  db,
  _,
  getUserInfo,
  getLevels,
  getPointsLogs,
  getGoods,
  getGoodsDetail,
  getCategories,
  exchangeGoods,
  getOrders,
  getOrderDetail,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getDefaultAddress,
  getNotices,
  checkAdmin,
  adminGrantPoints,
  verifyOrder,
  dailyCheckIn,
  register,
  getUserPublic,
  adminListUsers,
  generateMiniProgramCode,
  searchUsers,
  getCertificates,
  updateUserProfile
};
