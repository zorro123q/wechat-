const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

function getTodayKey(date) {
  const offsetMs = 8 * 60 * 60 * 1000;
  const t = new Date(date.getTime() + offsetMs);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function isDuplicateError(err) {
  const msg = String(err && (err.message || err.errMsg || err.errmsg || err));
  const code = err && (err.code || err.errCode || err.statusCode);
  return (
    code === 11000 ||
    code === 409 ||
    msg.includes('duplicate') ||
    msg.includes('duplicat') ||
    msg.includes('E11000') ||
    msg.includes('exists') ||
    msg.includes('Exist') ||
    msg.includes('conflict') ||
    msg.includes('Conflict') ||
    msg.includes('已存在') ||
    msg.includes('重复')
  );
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const now = new Date();
  const todayKey = getTodayKey(now);

  const pointsToAdd = 10;
  const logId = `checkin_${OPENID}_${todayKey}`;

  const transaction = await db.startTransaction();

  try {
    const userRes = await transaction.collection('users').where({ _openid: OPENID }).get();
    if (!userRes.data || userRes.data.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const user = userRes.data[0];
    const currentPoints = user.points || 0;
    const newBalance = currentPoints + pointsToAdd;

    try {
      await transaction.collection('points_logs').add({
        data: {
          _id: logId,
          _openid: OPENID,
          userId: user._id,
          type: 'earn',
          amount: pointsToAdd,
          balance: newBalance,
          reason: '每日签到',
          createTime: now
        }
      });
    } catch (err) {
      if (isDuplicateError(err)) {
        await transaction.rollback();
        return {
          success: true,
          alreadyCheckedIn: true,
          message: '今天已签到'
        };
      }
      throw err;
    }

    await transaction.collection('users').doc(user._id).update({
      data: {
        points: _.inc(pointsToAdd),
        totalPoints: _.inc(pointsToAdd),
        updateTime: now
      }
    });

    await transaction.commit();

    return {
      success: true,
      alreadyCheckedIn: false,
      addedPoints: pointsToAdd,
      newBalance
    };
  } catch (err) {
    if (isDuplicateError(err)) {
      await transaction.rollback();
      return {
        success: true,
        alreadyCheckedIn: true,
        message: '今天已签到'
      };
    }

    await transaction.rollback();
    return {
      success: false,
      message: err.message || '签到失败'
    };
  }
};
