// API 封装（延迟获取云能力，避免初始化失败导致整页崩溃）

function getCloud() {
  if (wx && wx.cloud) return wx.cloud;
  throw new Error('CLOUD_NOT_READY');
}

function getDB() {
  const cloud = getCloud();
  return cloud.database();
}

function getAuthToken() {
  return wx.getStorageSync('authToken');
}

const MEMO_CACHE = {};

function memoAsync(key, ttlMs, fetcher, options = {}) {
  const force = !!options.force;
  const now = Date.now();
  const item = MEMO_CACHE[key] || {};
  if (!force && item.value && item.expireAt && item.expireAt > now) {
    return Promise.resolve(item.value);
  }
  if (!force && item.promise) return item.promise;
  const p = Promise.resolve().then(fetcher).then(v => {
    MEMO_CACHE[key] = { value: v, expireAt: now + ttlMs };
    return v;
  }).catch(err => {
    if (MEMO_CACHE[key] && MEMO_CACHE[key].promise) delete MEMO_CACHE[key].promise;
    throw err;
  });
  MEMO_CACHE[key] = { ...MEMO_CACHE[key], promise: p };
  return p;
}

function getUserInfoCached(options = {}) {
  return memoAsync('userInfo', 15000, () => getUserInfo(), options);
}

function getUserPublicCached(params = {}, options = {}) {
  const hasParams = params && Object.keys(params).length > 0;
  if (hasParams) return getUserPublic(params);
  return memoAsync('userPublic', 15000, () => getUserPublic(), options);
}

const TEMP_URL_CACHE_KEY = 'tempFileUrlCache_v1';
let tempUrlCacheLoaded = false;
let tempUrlCache = {};

function loadTempUrlCache() {
  if (tempUrlCacheLoaded) return;
  tempUrlCacheLoaded = true;
  try {
    const v = wx.getStorageSync(TEMP_URL_CACHE_KEY);
    if (v && typeof v === 'object') tempUrlCache = v;
  } catch (_) { }
  if (!tempUrlCache || typeof tempUrlCache !== 'object') tempUrlCache = {};
}

function saveTempUrlCache() {
  try {
    wx.setStorageSync(TEMP_URL_CACHE_KEY, tempUrlCache);
  } catch (_) { }
}

function normalizeFileIds(fileIds) {
  const set = new Set();
  (fileIds || []).forEach(id => {
    const v = String(id || '').trim();
    if (v) set.add(v);
  });
  return Array.from(set);
}

function pruneTempUrlCache() {
  const now = Date.now();
  const keys = Object.keys(tempUrlCache || {});
  keys.forEach(k => {
    const v = tempUrlCache[k];
    if (!v || !v.url || !v.expireAt || v.expireAt <= now) {
      delete tempUrlCache[k];
    }
  });
  const afterKeys = Object.keys(tempUrlCache || {});
  const maxEntries = 500;
  if (afterKeys.length <= maxEntries) return;
  const arr = afterKeys.map(k => ({
    k,
    expireAt: (tempUrlCache[k] && tempUrlCache[k].expireAt) || 0
  }));
  arr.sort((a, b) => a.expireAt - b.expireAt);
  const removeCount = arr.length - maxEntries;
  for (let i = 0; i < removeCount; i += 1) {
    delete tempUrlCache[arr[i].k];
  }
}

function getTempFileURLCached(fileIds, options = {}) {
  const ids = normalizeFileIds(fileIds);
  if (ids.length === 0) return Promise.resolve({});
  loadTempUrlCache();
  pruneTempUrlCache();

  const now = Date.now();
  const hit = {};
  const miss = [];
  ids.forEach(id => {
    const item = tempUrlCache[id];
    if (item && item.url && item.expireAt && item.expireAt > now + 30 * 1000) {
      hit[id] = item.url;
    } else {
      miss.push(id);
    }
  });
  if (miss.length === 0) return Promise.resolve(hit);

  const maxAge = Number(options.maxAge || 3600);
  const expireAt = now + Math.max(60, maxAge - 60) * 1000;
  const cloud = getCloud();

  const chunks = [];
  for (let i = 0; i < miss.length; i += 50) {
    chunks.push(miss.slice(i, i + 50));
  }

  return Promise.all(chunks.map(list => cloud.getTempFileURL({
    fileList: list.map(fileID => ({ fileID, maxAge }))
  }))).then(results => {
    results.forEach(r => {
      (r && r.fileList ? r.fileList : []).forEach(it => {
        if (it && it.fileID && it.tempFileURL) {
          hit[it.fileID] = it.tempFileURL;
          tempUrlCache[it.fileID] = { url: it.tempFileURL, expireAt };
        }
      });
    });
    pruneTempUrlCache();
    saveTempUrlCache();
    return hit;
  });
}

function callAuthedFunction(name, data = {}) {
  try {
    return getCloud().callFunction({
      name,
      data: {
        ...data,
        token: getAuthToken()
      }
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * 获取用户信息
 * @returns {Promise}
 */
function getUserInfo() {
  return new Promise((resolve, reject) => {
    try {
      getCloud().callFunction({
        name: 'login',
        data: { action: 'check', token: getAuthToken() }
      }).then(loginRes => {
        const result = (loginRes && loginRes.result) || {};
        if (result.success && result.userInfo) {
          resolve(result.userInfo);
          return;
        }
        const err = new Error(result.message || 'NEED_LOGIN');
        err.code = 'NEED_LOGIN';
        reject(err);
      }).catch(err => {
        console.error('获取用户信息失败', err);
        reject(new Error('获取用户信息失败'));
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 获取等级配置
 * @returns {Promise}
 */
function getLevels() {
  try {
    return getDB().collection('levels')
      .orderBy('minPoints', 'asc')
      .get();
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * 获取积分明细
 * @param {object} params 查询参数
 * @returns {Promise}
 */
function getPointsLogs(params = {}) {
  const { type, page = 1, pageSize = 20 } = params;
  return callAuthedFunction('userApi', {
    action: 'getPointsLogs',
    type,
    page,
    pageSize
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    // userApi 在登录态校验失败时 r.message == 'NEED_LOGIN'
    if (!e.code && r.message) e.code = r.message;
    throw e;
  });
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
    where.name = getDB().RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  const query = getDB().collection('goods').where(where);

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
  try {
    return getDB().collection('goods').doc(id).get();
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * 获取商品分类
 * @returns {Promise}
 */
function getCategories() {
  try {
    return getDB().collection('categories')
      .orderBy('sort', 'asc')
      .get();
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * 兑换商品
 * @param {object} data 兑换数据
 * @returns {Promise}
 */
function exchangeGoods(data) {
  return callAuthedFunction('exchange', data);
}

/**
 * 获取订单列表
 * @param {object} params 查询参数
 * @returns {Promise}
 */
function getOrders(params = {}) {
  const { status, page = 1, pageSize = 20 } = params;
  return callAuthedFunction('userApi', {
    action: 'getOrders',
    status,
    page,
    pageSize
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    throw new Error(r.message || '加载失败');
  });
}

/**
 * 获取订单详情
 * @param {string} id 订单ID
 * @returns {Promise}
 */
function getOrderDetail(id) {
  return callAuthedFunction('userApi', {
    action: 'getOrderDetail',
    id
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    throw new Error(r.message || '加载失败');
  });
}

/**
 * 获取地址列表
 * @returns {Promise}
 */
function getAddresses() {
  return callAuthedFunction('userApi', {
    action: 'getAddresses'
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    throw new Error(r.message || '加载失败');
  });
}

/**
 * 添加地址
 * @param {object} data 地址数据
 * @returns {Promise}
 */
function addAddress(data) {
  return callAuthedFunction('userApi', {
    action: 'addAddress',
    data
  });
}

/**
 * 更新地址
 * @param {string} id 地址ID
 * @param {object} data 地址数据
 * @returns {Promise}
 */
function updateAddress(id, data) {
  return callAuthedFunction('userApi', {
    action: 'updateAddress',
    id,
    data
  });
}

/**
 * 删除地址
 * @param {string} id 地址ID
 * @returns {Promise}
 */
function deleteAddress(id) {
  return callAuthedFunction('userApi', {
    action: 'deleteAddress',
    id
  });
}

/**
 * 获取默认地址
 * @returns {Promise}
 */
function getDefaultAddress() {
  return callAuthedFunction('userApi', {
    action: 'getDefaultAddress'
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data ? [r.data] : [] };
    throw new Error(r.message || '加载失败');
  });
}

/**
 * 获取公告列表
 * @returns {Promise}
 */
function getNotices() {
  try {
    return getDB().collection('notices')
      .where({ status: 'on' })
      .orderBy('sort', 'asc')
      .orderBy('createTime', 'desc')
      .limit(10)
      .get();
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * 检查是否为管理员（调用云函数）
 * @returns {Promise<boolean>}
 */
function checkAdmin() {
  return callAuthedFunction('checkAdmin').then(res => {
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
  return callAuthedFunction('adminGrantPoints', data);
}

/**
 * 核销订单
 * @param {string} exchangeCode 兑换码
 * @returns {Promise}
 */
function verifyOrder(exchangeCode) {
  return callAuthedFunction('verifyOrder', { exchangeCode });
}

function dailyCheckIn() {
  return callAuthedFunction('dailyCheckIn');
}

/**
 * 注册接口（表单落库 + 引荐奖励）
 * @param {object} data 表单数据
 */
function register(data) {
  return callAuthedFunction('register', data);
}

/**
 * 获取用户公用信息（脱敏）+ 最高证书
 * @param {object} params { userId?, targetOpenid? }
 */
function getUserPublic(params = {}) {
  return callAuthedFunction('getUserPublic', params);
}

function adminListUsers(params = {}) {
  return callAuthedFunction('adminListUsers', params);
}

function generateMiniProgramCode(params = {}) {
  return callAuthedFunction('generateMiniProgramCode', params);
}

/**
 * 搜索学员
 * @param {string} keyword 关键词
 * @returns {Promise}
 */
function searchUsers(keyword) {
  return callAuthedFunction('adminListUsers', { page: 1, pageSize: 20, keyword }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.list || [] };
    throw new Error(r.message || 'no permission');
  });
}

/**
 * 获取用户证书
 */
const getCertificates = () => {
  return callAuthedFunction('userApi', { action: 'getCertificates' }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    throw new Error(r.message || '加载失败');
  });
};

function updateUserProfile(userId, data = {}) {
  return callAuthedFunction('userApi', {
    action: 'updateUserProfile',
    data
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    throw new Error(r.message || '保存失败');
  });
}

function getPasswordStatus() {
  return callAuthedFunction('userApi', { action: 'getPasswordStatus' }).then(res => {
    const r = res.result || {};
    if (r.success) return { hasPassword: !!r.hasPassword };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function uploadCertificate(fileID) {
  return callAuthedFunction('userApi', {
    action: 'uploadCertificate',
    fileID
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '上传失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function getUploadedCertificates() {
  return callAuthedFunction('userApi', {
    action: 'getUploadedCertificates'
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function deleteUploadedCertificate(id) {
  return callAuthedFunction('userApi', { action: 'deleteUploadedCertificate', id }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '删除失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminGetUserCertificates(userId) {
  return callAuthedFunction('userApi', {
    action: 'adminGetUserCertificates',
    userId
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminIssueCertificate(params) {
  return callAuthedFunction('userApi', {
    action: 'adminIssueCertificate',
    ...params
  }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '发放失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminListCategories() {
  return callAuthedFunction('userApi', { action: 'adminListCategories' }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminUpsertCategory(id, data) {
  return callAuthedFunction('userApi', { action: 'adminUpsertCategory', id, data }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '保存失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminDeleteCategory(id) {
  return callAuthedFunction('userApi', { action: 'adminDeleteCategory', id }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '删除失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminListGoods(params = {}) {
  return callAuthedFunction('userApi', { action: 'adminListGoods', ...params }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminUpsertGoods(id, data) {
  return callAuthedFunction('userApi', { action: 'adminUpsertGoods', id, data }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '保存失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminDeleteGoods(id) {
  return callAuthedFunction('userApi', { action: 'adminDeleteGoods', id }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '删除失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminListPointsLogs(params = {}) {
  return callAuthedFunction('userApi', { action: 'adminListPointsLogs', ...params }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminListOrders(params = {}) {
  return callAuthedFunction('userApi', { action: 'adminListOrders', ...params }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || [] };
    const e = new Error(r.message || '加载失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

function adminUpdateOrder(id, data) {
  return callAuthedFunction('userApi', { action: 'adminUpdateOrder', id, data }).then(res => {
    const r = res.result || {};
    if (r.success) return { data: r.data || null };
    const e = new Error(r.message || '操作失败');
    if (r.code) e.code = r.code;
    throw e;
  });
}

module.exports = {
  getUserInfo,
  getUserInfoCached,
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
  getUserPublicCached,
  adminListUsers,
  generateMiniProgramCode,
  searchUsers,
  getCertificates,
  updateUserProfile,
  getPasswordStatus,
  getUploadedCertificates,
  deleteUploadedCertificate,
  uploadCertificate,
  adminGetUserCertificates,
  adminIssueCertificate,
  adminListCategories,
  adminUpsertCategory,
  adminDeleteCategory,
  adminListGoods,
  adminUpsertGoods,
  adminDeleteGoods,
  adminListPointsLogs,
  adminListOrders,
  adminUpdateOrder,
  getTempFileURLCached
};
