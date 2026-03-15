// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 根据手机号或身份证从系统数据库匹配等级
async function getUserLevelFromSystem(phone, idCard) {
  try {
    // 查询系统等级映射表
    // 这里假设存在一个 level_mappings 集合，存储手机号/身份证与等级的映射关系
    // 实际项目中需要根据实际的系统数据库结构进行调整
    let query = {};
    if (phone) {
      query.phone = phone;
    }
    if (idCard) {
      query.idCard = idCard;
    }

    if (phone || idCard) {
      const mappingRes = await db.collection('level_mappings')
        .where(query)
        .get();

      if (mappingRes.data.length > 0) {
        return mappingRes.data[0].level;
      }
    }
  } catch (err) {
    console.error('查询等级映射失败', err);
  }

  // 默认返回初级
  return 'junior';
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { phone, idCard, referralCode: referralCodeInput } = event;

  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users')
      .where({
        _openid: OPENID
      })
      .get();

    let userInfo;

    if (userRes.data.length > 0) {
      // 用户已存在
      userInfo = userRes.data[0];

      const ensureReferralCode = OPENID.slice(-8);
      if (!userInfo.referralCode) {
        await db.collection('users').doc(userInfo._id).update({
          data: {
            referralCode: ensureReferralCode,
            updateTime: new Date()
          }
        });
        userInfo.referralCode = ensureReferralCode;
      }

      // 如果提供了手机号或身份证，更新等级
      if (phone || idCard) {
        const level = await getUserLevelFromSystem(phone, idCard);
        if (level !== userInfo.level) {
          await db.collection('users').doc(userInfo._id).update({
            data: {
              level,
              phone: phone || userInfo.phone,
              idCard: idCard || userInfo.idCard,
              updateTime: new Date()
            }
          });
          userInfo.level = level;
          if (phone) userInfo.phone = phone;
          if (idCard) userInfo.idCard = idCard;
        }
      }
    } else {
      // 新用户，创建用户记录
      const now = new Date();

      // 根据手机号或身份证匹配等级
      const level = await getUserLevelFromSystem(phone, idCard);

      const ownReferralCode = OPENID.slice(-8);

      const newUser = {
        _openid: OPENID, // 强制写入 openid
        name: '学员' + OPENID.slice(-6),
        avatar: '',
        phone: phone || '',
        idCard: idCard || '',
        level: level,
        points: 0,
        totalPoints: 0,
        createTime: now,
        updateTime: now,
        school: '',
        degree: '',
        company: '',
        role: '',
        experience: '',
        trainingIntention: '',
        referralCode: ownReferralCode
      };

      const transaction = await db.startTransaction();

      try {
        const addRes = await transaction.collection('users').add({
          data: newUser
        });

        userInfo = {
          _id: addRes._id,
          ...newUser
        };

        const referralRewardPoints = 50;

        if (referralCodeInput && referralCodeInput !== ownReferralCode) {
          const refRes = await transaction.collection('users').where({ referralCode: referralCodeInput }).get();
          if (refRes.data && refRes.data.length > 0) {
            const refUser = refRes.data[0];
            if (refUser && refUser._id && refUser._id !== addRes._id) {
              await transaction.collection('users').doc(refUser._id).update({
                data: {
                  points: _.inc(referralRewardPoints),
                  totalPoints: _.inc(referralRewardPoints),
                  updateTime: now
                }
              });

              await transaction.collection('points_logs').add({
                data: {
                  _openid: refUser._openid,
                  userId: refUser._id,
                  type: 'earn',
                  amount: referralRewardPoints,
                  balance: (refUser.points || 0) + referralRewardPoints,
                  reason: `引荐奖励：${newUser.name}`,
                  relatedId: addRes._id,
                  createTime: now
                }
              });
            }
          }
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
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
