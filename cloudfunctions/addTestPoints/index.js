// 云函数：addTestPoints
// 作用：为当前用户添加一笔测试积分记录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  try {
    // 1. 获取用户信息，拿到当前积分
    const userRes = await db.collection('users').where({ _openid: OPENID }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const currentUser = userRes.data[0];
    const currentPoints = currentUser.points || 0;

    const pointsToAdd = 50;
    const newBalance = currentPoints + pointsToAdd;

    // 2. 在 points_logs 集合中添加一条记录
    await db.collection('points_logs').add({
      data: {
        _openid: OPENID, // 记录创建者
        userId: currentUser._id, // 关联用户ID
        amount: pointsToAdd,
        balance: newBalance,
        reason: '后台测试奖励',
        type: 'earn',
        createTime: new Date()
      }
    });

    // 3. 更新 users 集合中的用户总积分
    await db.collection('users').doc(currentUser._id).update({
      data: {
        points: _.inc(pointsToAdd),
        totalPoints: _.inc(pointsToAdd)
      }
    });

    return { success: true, message: '添加成功' };

  } catch (err) {
    console.error('添加测试积分失败', err);
    return {
      success: false,
      message: err.message
    };
  }
};
