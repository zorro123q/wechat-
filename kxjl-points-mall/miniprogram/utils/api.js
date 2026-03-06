// API 封装

const db = wx.cloud.database();
const _ = db.command;

/**
 * 获取用户信息
 * @returns {Promise}
 */
function getUserInfo() {
  return new Promise((resolve, reject) => {
    db.collection('users')
      .limit(1)
      .get()
      .then(res => {
        if (res.data.length > 0) {
          resolve(res.data[0]);
        } else {
          reject(new Error('用户不存在'));
        }
      })
      .catch(reject);
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
  let query = db.collection('points_logs');

  if (type) {
    query = query.where({ type });
  }

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
  let query = db.collection('goods').where({ status: 'on' });

  if (category) {
    query = query.where({ category });
  }

  if (keyword) {
    query = query.where({
      name: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    });
  }

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
 * 检查是否为管理员
 * @returns {Promise}
 */
function checkAdmin() {
  return db.collection('admins')
    .limit(1)
    .get()
    .then(res => res.data.length > 0);
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
  searchUsers
};
