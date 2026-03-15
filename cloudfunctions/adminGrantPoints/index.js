// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { userId, points, reason } = event;

  // 验证参数
  if (!userId || !points || points <= 0 || !reason) {
    return {
      success: false,
      message: '参数错误'
    };
  }

  const transaction = await db.startTransaction();

  try {
    // 1. 验证管理员权限
    const adminRes = await transaction.collection('admins')
      .where(_.or([
        { openid: OPENID },
        { _openid: OPENID }
      ]))
      .get();

    if (adminRes.data.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        message: '无管理员权限'
      };
    }

    // 2. 查询用户信息
    const userRes = await transaction.collection('users').doc(userId).get();
    if (!userRes.data) {
      await transaction.rollback();
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const user = userRes.data;
    const now = new Date();

    // 3. 增加用户积分
    const newPoints = (user.points || 0) + points;
    const newTotalPoints = (user.totalPoints || 0) + points;

    await transaction.collection('users').doc(userId).update({
      data: {
        points: newPoints,
        totalPoints: newTotalPoints,
        updateTime: now
      }
    });

    // 4. 记录积分日志
    await transaction.collection('points_logs').add({
      data: {
        _openid: user._openid,
        userId,
        type: 'earn',
        amount: points,
        balance: newPoints,
        reason,
        operatorId: adminRes.data[0]._id,
        createTime: now
      }
    });

    // 注意：等级不再与积分数量绑定，等级通过手机号/身份证从系统数据库匹配
    // 这里不再自动更新等级

    await transaction.commit();

    return {
      success: true,
      newPoints,
      currentLevel: user.level
    };
  } catch (err) {
    console.error('发放积分失败', err);
    await transaction.rollback();
    return {
      success: false,
      message: err.message || '发放积分失败'
    };
  }
};
