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

  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users')
      .where({
        _openid: OPENID
      })
      .get();

    let userInfo;

    if (userRes.data.length > 0) {
      // 用户已存在，返回用户信息
      userInfo = userRes.data[0];
    } else {
      // 新用户，创建用户记录
      const now = new Date();
      const newUser = {
        name: '学员' + OPENID.slice(-6),
        avatar: '',
        phone: '',
        level: 'junior',
        points: 0,
        totalPoints: 0,
        createTime: now,
        updateTime: now
      };

      const addRes = await db.collection('users').add({
        data: newUser
      });

      userInfo = {
        _id: addRes._id,
        ...newUser
      };
    }

    return {
      success: true,
      openid: OPENID,
      userInfo
    };
  } catch (err) {
    console.error('登录失败', err);
    return {
      success: false,
      message: err.message
    };
  }
};
