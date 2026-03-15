const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function maskPhone(p) {
  if (!p || typeof p !== 'string') return '';
  if (p.length < 7) return p;
  return p.slice(0, 3) + '****' + p.slice(-4);
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const {
    name = '',
    avatar = '',
    phone = '',
    idCard = '',
    school = '',
    degree = '',
    company = '',
    role = '',
    experience = '',
    trainingIntention = '',
    referralCode // 推荐人的推荐码，可为空
  } = event || {};

  const now = new Date();
  const transaction = await db.startTransaction();

  try {
    // 若已存在账户，直接返回（避免重复注册）
    const existsRes = await transaction.collection('users').where({ _openid: OPENID }).get();
    if (existsRes.data && existsRes.data.length > 0) {
      await transaction.rollback();
      const user = existsRes.data[0];
      return {
        success: true,
        existed: true,
        userPublic: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          level: user.level,
          points: user.points,
          totalPoints: user.totalPoints,
          phoneMasked: maskPhone(user.phone),
          createTime: user.createTime
        }
      };
    }

    // 构建新用户
    const selfReferralCode = OPENID.slice(-8);
    const level = 'junior';
    const newUser = {
      _openid: OPENID,
      name: name || ('学员' + OPENID.slice(-6)),
      avatar: avatar || '',
      phone: phone || '',
      idCard: idCard || '',
      level,
      points: 0,
      totalPoints: 0,
      createTime: now,
      updateTime: now,
      school,
      degree,
      company,
      role,
      experience,
      trainingIntention,
      referralCode: selfReferralCode
    };

    // 写入用户
    const addRes = await transaction.collection('users').add({ data: newUser });
    const newUserId = addRes._id;

    // 引荐奖励
    const reward = 50;
    if (referralCode && referralCode !== selfReferralCode) {
      const refRes = await transaction.collection('users').where({ referralCode }).get();
      if (refRes.data && refRes.data.length > 0) {
        const refUser = refRes.data[0];
        if (refUser && refUser._id && refUser._id !== newUserId) {
          await transaction.collection('users').doc(refUser._id).update({
            data: {
              points: _.inc(reward),
              totalPoints: _.inc(reward),
              updateTime: now
            }
          });
          await transaction.collection('points_logs').add({
            data: {
              _openid: refUser._openid,
              userId: refUser._id,
              type: 'earn',
              amount: reward,
              balance: (refUser.points || 0) + reward,
              reason: `引荐奖励：${newUser.name}`,
              relatedId: newUserId,
              createTime: now
            }
          });
        }
      }
    }

    await transaction.commit();

    return {
      success: true,
      userPublic: {
        _id: newUserId,
        name: newUser.name,
        avatar: newUser.avatar,
        level: newUser.level,
        points: newUser.points,
        totalPoints: newUser.totalPoints,
        phoneMasked: maskPhone(newUser.phone),
        createTime: now
      }
    };
  } catch (err) {
    await transaction.rollback();
    console.error('注册失败', err);
    return {
      success: false,
      message: err.message || '注册失败'
    };
  }
};

