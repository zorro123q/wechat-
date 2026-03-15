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
  const { exchangeCode } = event;

  if (!exchangeCode) {
    return {
      success: false,
      message: '请提供兑换码'
    };
  }

  const transaction = await db.startTransaction();

  try {
    // 1. 验证管理员权限
    const adminRes = await transaction.collection('admins')
      .where({
        _openid: OPENID
      })
      .get();

    if (adminRes.data.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        message: '无管理员权限'
      };
    }

    // 2. 查询订单
    const orderRes = await transaction.collection('orders')
      .where({
        exchangeCode
      })
      .get();

    if (orderRes.data.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        message: '订单不存在'
      };
    }

    const order = orderRes.data[0];

    // 3. 检查订单状态
    if (order.status === 'completed') {
      await transaction.rollback();
      return {
        success: false,
        message: '订单已核销'
      };
    }

    if (order.status === 'cancelled') {
      await transaction.rollback();
      return {
        success: false,
        message: '订单已取消'
      };
    }

    const now = new Date();

    // 4. 更新订单状态为已完成
    await transaction.collection('orders').doc(order._id).update({
      data: {
        status: 'completed',
        verifyTime: now,
        updateTime: now
      }
    });

    await transaction.commit();

    return {
      success: true,
      orderId: order._id
    };
  } catch (err) {
    console.error('核销失败', err);
    await transaction.rollback();
    return {
      success: false,
      message: err.message || '核销失败'
    };
  }
};
