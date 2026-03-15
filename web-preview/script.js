// 页面切换功能
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.page-tab');
    const pages = document.querySelectorAll('.page');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const pageId = 'page-' + this.dataset.page;

            // 移除所有激活状态
            tabs.forEach(t => t.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            // 添加当前激活状态
            this.classList.add('active');
            document.getElementById(pageId).classList.add('active');
        });
    });

    // 模拟一些交互效果
    const exchangeBtns = document.querySelectorAll('.exchange-btn:not(.exchange-btn-disabled)');
    exchangeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            alert('兑换成功！');
        });
    });

    const quickActionBtns = document.querySelectorAll('.quick-action-btn, .menu-list-item, .menu-item');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('功能开发中...');
        });
    });

    console.log('科讯嘉联训机师学苑积分管理平台 - 预览页面已加载');
});
