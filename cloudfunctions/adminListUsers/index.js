const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const {
    page = 1,
    pageSize = 20,
    keyword = '',
    level = ''
  } = event || {};

  const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const skip = Math.max(parseInt(page, 10) - 1, 0) * size;

  try {
    const adminByField = await db.collection('admins').where({ openid: OPENID }).count();
    const adminByOwner = await db.collection('admins').where({ _openid: OPENID }).count();
    if ((adminByField.total || 0) + (adminByOwner.total || 0) === 0) {
      return { success: false, message: 'no permission' };
    }

    let where = {};
    if (keyword) {
      where.name = db.RegExp({ regexp: keyword, options: 'i' });
    }
    if (level) {
      where.level = level;
    }

    const totalRes = await db.collection('users').where(where).count();
    const listRes = await db.collection('users')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(size)
      .get();

    return {
      success: true,
      total: totalRes.total || 0,
      list: listRes.data || []
    };
  } catch (err) {
    console.error('admin list users failed', err);
    return { success: false, message: err.message || 'failed' };
  }
};

