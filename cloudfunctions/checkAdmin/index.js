// 云函数：checkAdmin
// 作用：检查当前用户是否是管理员
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    const byOpenidField = await db.collection('admins').where({ openid: OPENID }).count();
    const byOwnerField = await db.collection('admins').where({ _openid: OPENID }).count();
    const total = (byOpenidField.total || 0) + (byOwnerField.total || 0);

    return {
      success: true,
      isAdmin: total > 0,
      openid: OPENID
    };
  } catch (err) {
    console.error('检查管理员权限失败', err);
    return {
      success: false,
      isAdmin: false,
      message: err.message
    };
  }
};
