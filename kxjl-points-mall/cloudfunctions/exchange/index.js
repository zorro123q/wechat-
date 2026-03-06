// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${month}${day}${random}`;
}

// 生成兑换码
function generateExchangeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { goodsId, addressId, remark } = event;

  const transaction = await db.startTransaction();

  try {
    // 1. 查询商品信息
    const goodsRes = await transaction.collection('goods').doc(goodsId).get();
    if (!goodsRes.data) {
      await transaction.rollback();
      return {
        success: false,
        message: '商品不存在'
      };
    }

    const goods = goodsRes.data;

    // 2. 检查商品状态和库存
    if (goods.status !== 'on') {
      await transaction.rollback();
      return {
        success: false,
        message: '商品已下架'
      };
    }

    if (goods.stock <= 0) {
      await transaction.rollback();
      return {
        success: false,
        message: '商品库存不足'
      };
    }

    // 3. 查询用户信息
    const userRes = await transaction.collection('users')
      .where({
        _openid: OPENID
      })
      .get();

    if (userRes.data.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const user = userRes.data[0];

    // 4. 检查积分是否足够
    if (user.points < goods.points) {
      await transaction.rollback();
      return {
        success: false,
        message: '积分不足'
      };
    }

    // 5. 查询收货地址
    const addressRes = await transaction.collection('addresses').doc(addressId).get();
    if (!addressRes.data) {
      await transaction.rollback();
      return {
        success: false,
        message: '收货地址不存在'
      };
    }

    const address = addressRes.data;

    const now = new Date();
    const orderNo = generateOrderNo();
    const exchangeCode = generateExchangeCode();

    // 6. 扣减用户积分
    await transaction.collection('users').doc(user._id).update({
      data: {
        points: _.inc(-goods.points),
        updateTime: now
      }
    });

    // 7. 扣减商品库存，增加销量
    await transaction.collection('goods').doc(goodsId).update({
      data: {
        stock: _.inc(-1),
        sold: _.inc(1),
        updateTime: now
      }
    });

    // 8. 创建订单
    const orderData = {
      orderNo,
      userId: user._id,
      goodsId,
      goodsName: goods.name,
      goodsImage: goods.images[0] || '',
      points: goods.points,
      status: 'pending',
      address: {
        name: address.name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail: address.detail
      },
      remark: remark || '',
      exchangeCode,
      createTime: now,
      updateTime: now
    };

    const orderRes = await transaction.collection('orders').add({
      data: orderData
    });

    // 9. 记录积分日志
    await transaction.collection('points_logs').add({
      data: {
        userId: user._id,
        type: 'spend',
        amount: goods.points,
        balance: user.points - goods.points,
        reason: `兑换商品：${goods.name}`,
        relatedId: orderRes._id,
        createTime: now
      }
    });

    // 10. 检查并更新用户等级
    const newPoints = user.points - goods.points;
    let newLevel = 'junior';
    if (newPoints >= 5000) {
      newLevel = 'senior';
    } else if (newPoints >= 1000) {
      newLevel = 'intermediate';
    }

    if (newLevel !== user.level) {
      await transaction.collection('users').doc(user._id).update({
        data: {
          level: newLevel,
          updateTime: now
        }
      });
    }

    await transaction.commit();

    return {
      success: true,
      orderId: orderRes._id,
      orderNo,
      exchangeCode
    };
  } catch (err) {
    console.error('兑换失败', err);
    await transaction.rollback();
    return {
      success: false,
      message: err.message || '兑换失败'
    };
  }
};
