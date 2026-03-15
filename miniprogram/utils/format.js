// 格式化工具函数

/**
 * 格式化时间
 * @param {Date|string} date 日期对象或时间戳
 * @param {string} format 格式化字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';

  let d;
  if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return '';
  }

  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 格式化为相对时间
 * @param {Date|string} date 日期对象或时间戳
 * @returns {string} 相对时间字符串
 */
function formatRelativeTime(date) {
  if (!date) return '';

  let d;
  if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return '';
  }

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatTime(d, 'MM-DD');
  }
}

/**
 * 格式化数字，添加千分位
 * @param {number} num 数字
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化积分显示
 * @param {number} points 积分
 * @returns {string} 格式化后的积分字符串
 */
function formatPoints(points) {
  if (typeof points !== 'number') return '0';
  if (points >= 10000) {
    return (points / 10000).toFixed(1) + '万';
  }
  return formatNumber(points);
}

/**
 * 隐藏手机号中间四位
 * @param {string} phone 手机号
 * @returns {string} 脱敏后的手机号
 */
function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 获取等级信息
 * @param {string} levelKey 等级key (junior/intermediate/senior)
 * @returns {object} 等级信息
 */
function getLevelInfo(levelKey) {
  levelKey = levelKey || 'junior';

  const levels = {
    'senior': {
      key: 'senior',
      name: '高级训机师',
      color: '#f5222d',
      gradient: 'linear-gradient(135deg, #f5222d 0%, #cf1322 100%)'
    },
    'intermediate': {
      key: 'intermediate',
      name: '中级训机师',
      color: '#faad14',
      gradient: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)'
    },
    'junior': {
      key: 'junior',
      name: '初级训机师',
      color: '#52c41a',
      gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
    }
  };

  return levels[levelKey] || levels['junior'];
}

/**
 * 获取订单状态文本
 * @param {string} status 订单状态
 * @returns {string} 状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    pending: '待发货',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消'
  };
  return statusMap[status] || '未知';
}

/**
 * 获取订单状态颜色
 * @param {string} status 订单状态
 * @returns {string} 状态颜色
 */
function getOrderStatusColor(status) {
  const colorMap = {
    pending: '#faad14',
    shipped: '#1890ff',
    completed: '#52c41a',
    cancelled: '#999999'
  };
  return colorMap[status] || '#999999';
}

module.exports = {
  formatTime,
  formatRelativeTime,
  formatNumber,
  formatPoints,
  maskPhone,
  getLevelInfo,
  getOrderStatusText,
  getOrderStatusColor
};
