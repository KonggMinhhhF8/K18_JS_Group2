import { renderTable } from '../../js/components/table.js';

function formatMoney(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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

function createActions() {
    const fragment = document.createDocumentFragment();
    const eye = document.createElement('button');
    eye.className = 'btn-action';
    eye.title = 'Xem chi tiết';
    eye.innerHTML = '<i class="fas fa-eye"></i>';

    const print = document.createElement('button');
    print.className = 'btn-action';
    print.title = 'In hóa đơn';
    print.innerHTML = '<i class="fas fa-print"></i>';

    fragment.appendChild(eye);
    fragment.appendChild(print);
    return fragment;
}

const orders = [
    { id: '#ORD-7721', customer: 'Nguyễn Văn An', phone: '0912.345.xxx', products: 'iPhone 15 Pro Max (x1)', total: 32500000, status: 'shipping' },
    { id: '#ORD-7722', customer: 'Lê Thị Bình', phone: '0988.777.xxx', products: 'AirPods Pro (x2), Case (x2)', total: 11200000, status: 'completed' },
    { id: '#ORD-7723', customer: 'Phạm Minh Cường', phone: '0355.123.xxx', products: 'Ốp lưng Silicon', total: 250000, status: 'pending' },
    { id: '#ORD-7724', customer: 'Hoàng Anh Tuấn', phone: '0909.888.xxx', products: 'Sạc nhanh 20W', total: 490000, status: 'cancelled' }
];

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
    { key: 'total', label: 'Tổng tiền', render: total => formatMoney(total) },
    { key: 'status', label: 'Trạng thái', render: status => createStatusNode(status) },
    { key: 'actions', label: 'Thao tác', render: () => createActions() }
];

function init() {
    renderTable({
        containerId: 'orders-table-root',
        title: 'Danh sách đơn hàng',
        columns,
        rows: orders,
        tableId: 'orders-table'
    });
}

if (document.readyState !== 'loading') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}
