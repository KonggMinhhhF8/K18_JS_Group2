import { renderTable } from '../../js/components/table.js';
import { api } from '../../js/api.js';

const ordersEndpoint = '/orders';
let ordersData = [];

function formatMoney(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('vi-VN');
}

function statusLabel(status) {
    const mapping = {
        pending: { text: 'Chờ xử lý', className: 'badge pending' },
        shipping: { text: 'Đang giao', className: 'badge shipping' },
        completed: { text: 'Hoàn thành', className: 'badge completed' },
        cancelled: { text: 'Đã hủy', className: 'badge cancelled' }
    };
    return mapping[status] || { text: status || 'Không xác định', className: 'badge' };
}

function createStatusNode(status) {
    const item = statusLabel(status);
    const span = document.createElement('span');
    span.className = item.className;
    span.textContent = item.text;
    return span;
}

function getOverlayElement() {
    let overlay = document.getElementById('order-detail-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'order-detail-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'none';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.padding = '20px';
        overlay.style.overflowY = 'auto';

        const card = document.createElement('div');
        card.id = 'order-detail-card';
        card.style.backgroundColor = '#fff';
        card.style.borderRadius = '10px';
        card.style.maxWidth = '540px';
        card.style.width = '100%';
        card.style.padding = '20px';
        card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
        card.style.position = 'relative';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '12px';
        closeBtn.style.right = '12px';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.fontSize = '1.5rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        const content = document.createElement('div');
        content.id = 'order-detail-content';

        const actions = document.createElement('div');
        actions.style.marginTop = '18px';
        actions.style.textAlign = 'right';

        const printBtn = document.createElement('button');
        printBtn.textContent = 'In hóa đơn';
        printBtn.className = 'btn-export';
        printBtn.style.cursor = 'pointer';
        printBtn.addEventListener('click', () => {
            const order = overlay.dataset.currentOrder ? JSON.parse(overlay.dataset.currentOrder) : null;
            if (order) {
                printOrder(order);
            }
        });

        actions.appendChild(printBtn);
        card.appendChild(closeBtn);
        card.appendChild(content);
        card.appendChild(actions);
        overlay.appendChild(card);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                overlay.style.display = 'none';
            }
        });

        document.body.appendChild(overlay);
    }
    return overlay;
}

function showOrderDetail(order) {
    const overlay = getOverlayElement();
    overlay.dataset.currentOrder = JSON.stringify(order);

    const content = overlay.querySelector('#order-detail-content');
    if (!content) return;

    content.innerHTML = `
        <h2 style="margin-bottom: 10px;">Chi tiết đơn ${order.id}</h2>
        <p><strong>Khách hàng:</strong> ${order.customer}</p>
        <p><strong>Số điện thoại:</strong> ${order.phone}</p>
        <p><strong>Sản phẩm:</strong> ${order.products}</p>
        <p><strong>Ngày đặt:</strong> ${formatDate(order.date)}</p>
        <p><strong>Tổng tiền:</strong> ${formatMoney(order.total)}</p>
        <p><strong>Trạng thái:</strong> ${statusLabel(order.status).text}</p>
    `;

    overlay.style.display = 'flex';
}

function printOrder(order) {
    const overlay = getOverlayElement();
    overlay.dataset.currentOrder = JSON.stringify(order);
    showOrderDetail(order);
}

function createActions(order) {
    const fragment = document.createDocumentFragment();
    const eye = document.createElement('button');
    eye.className = 'btn-action';
    eye.title = 'Xem chi tiết';
    eye.innerHTML = '<i class="fas fa-eye"></i>';
    eye.addEventListener('click', () => showOrderDetail(order));

    const print = document.createElement('button');
    print.className = 'btn-action';
    print.title = 'In hóa đơn';
    print.innerHTML = '<i class="fas fa-print"></i>';
    print.addEventListener('click', () => printOrder(order));

    fragment.appendChild(eye);
    fragment.appendChild(print);
    return fragment;
}

const filters = {
    keyword: '',
    status: 'all',
    date: ''
};

const columns = [
    { key: 'id', label: 'Mã đơn' },
    {
        key: 'customer',
        label: 'Khách hàng',
        render: (value, row) => {
            const container = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = value;
            const phone = document.createElement('small');
            phone.textContent = row.phone;
            container.appendChild(name);
            container.appendChild(document.createElement('br')); 
            container.appendChild(phone);
            return container;
        }
    },
    { key: 'products', label: 'Sản phẩm' },
    { key: 'date', label: 'Ngày đặt', render: value => formatDate(value) },
    { key: 'total', label: 'Tổng tiền', render: total => formatMoney(total) },
    { key: 'status', label: 'Trạng thái', render: status => createStatusNode(status) },
    { key: 'actions', label: 'Thao tác', render: (_, row) => createActions(row) }
];

async function loadOrders() {
    try {
        const data = await api.get(ordersEndpoint);

        if (Array.isArray(data)) {
            ordersData = data;
        } else if (Array.isArray(data?.items)) {
            ordersData = data.items;
        } else if (Array.isArray(data?.data)) {
            ordersData = data.data;
        } else {
            ordersData = [];
        }

    } catch (error) {
        console.error('Không thể tải dữ liệu đơn hàng:', error);
        ordersData = [];
        window.alert('Lỗi khi tải dữ liệu đơn hàng từ API. Vui lòng thử lại.');
    }

    updateStats();
    renderOrders();
}

function updateStats() {
    const total = ordersData.length;
    const pending = ordersData.filter(o => o.status === 'pending').length;
    const shipping = ordersData.filter(o => o.status === 'shipping').length;
    const completed = ordersData.filter(o => o.status === 'completed').length;
    const cancelled = ordersData.filter(o => o.status === 'cancelled').length;

    const cards = document.querySelectorAll('.stats .card');
    if (cards.length >= 4) {
        cards[0].querySelector('p').textContent = total.toLocaleString('vi-VN');
        cards[1].querySelector('p').textContent = pending.toLocaleString('vi-VN');
        cards[2].querySelector('p').textContent = completed.toLocaleString('vi-VN');
        cards[3].querySelector('p').textContent = cancelled.toLocaleString('vi-VN');
    }
}

function getFilteredOrders() {
    return ordersData.filter(order => {
        const keyword = filters.keyword.trim().toLowerCase();
        const status = filters.status;
        const date = filters.date;

        if (status !== 'all' && order.status !== status) return false;
        if (date && order.date !== date) return false;
        if (!keyword) return true;

        const text = [order.id, order.customer, order.phone, order.products].join(' ').toLowerCase();
        return text.includes(keyword);
    });
}

function renderOrders() {
    const rows = getFilteredOrders();
    renderTable({
        containerId: 'orders-table-root',
        title: 'Danh sách đơn hàng',
        columns,
        rows,
        tableId: 'orders-table',
        emptyMessage: 'Không tìm thấy đơn hàng phù hợp'
    });
}

function exportToExcel() {
    const rows = getFilteredOrders();
    if (!rows.length) {
        window.alert('Không có đơn hàng nào để xuất.');
        return;
    }

    const header = ['Mã đơn', 'Khách hàng', 'SĐT', 'Sản phẩm', 'Ngày đặt', 'Tổng tiền', 'Trạng thái'];
    const csvRows = [header.join(',')];

    rows.forEach(order => {
        const row = [
            order.id,
            order.customer,
            order.phone,
            `"${order.products}"`,
            order.date,
            order.total,
            statusLabel(order.status).text
        ];
        csvRows.push(row.join(','));
    });

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function initControls() {
    const searchInput = document.querySelector('.search-bar input');
    const exportBtn = document.querySelector('.btn-export');
    const tabButtons = Array.from(document.querySelectorAll('.tab'));
    const dateInput = document.querySelector('.date-filter input');

    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                filters.keyword = searchInput.value;
                renderOrders();
            }, 180);
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }

    if (dateInput) {
        dateInput.addEventListener('change', () => {
            filters.date = dateInput.value;
            renderOrders();
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            const text = button.textContent.trim().toLowerCase();
            if (text === 'tất cả') filters.status = 'all';
            else if (text.includes('chờ')) filters.status = 'pending';
            else if (text.includes('đang')) filters.status = 'shipping';
            else if (text.includes('xong')) filters.status = 'completed';
            else filters.status = 'all';

            renderOrders();
        });
    });
}

async function init() {
    initControls();
    await loadOrders();
}

if (document.readyState !== 'loading') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}
