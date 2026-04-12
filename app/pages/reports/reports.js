import { renderSidebar } from "../../js/components/sidebar.js";
import { renderTable } from "../../js/components/table.js";
import { api } from "../../js/api.js";

const container = document.querySelector(".container");
container.insertAdjacentHTML("afterbegin", renderSidebar("reports", "../../"));

const ordersEndpoint = "/orders";
const productsEndpoint = "/products";
const customersEndpoint = "/customers";

const state = {
    orders: [],
    products: [],
    customers: [],
    revenueChart: null,
    categoryChart: null,
};

const topProductColumns = [
    {
        key: "name",
        label: "Sản phẩm",
        render: (_, row) => {
            const strong = document.createElement("strong");
            strong.textContent = row.name;
            return strong;
        },
    },
    {
        key: "sold",
        label: "Số lượng bán",
        render: (value) => `${value}`,
    },
    {
        key: "revenue",
        label: "Doanh thu",
        render: (value) => formatMoney(value),
    },
    {
        key: "status",
        label: "Tình trạng",
        render: (value) => {
            const span = document.createElement("span");
            span.textContent = value.label;
            span.style.color = value.color;
            span.style.fontWeight = "600";
            return span;
        },
    },
];

function parseMaybeJson(value) {
    if (typeof value !== "string") return value;

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function pickFirstValue(...values) {
    return values.find((value) => {
        if (value === undefined || value === null) return false;
        if (typeof value === "string") return value.trim() !== "";
        return true;
    });
}

function toNumber(value) {
    if (typeof value === "number") return value;

    if (typeof value !== "string") {
        return Number(value) || 0;
    }

    const digitsOnly = value.replace(/[^\d-]/g, "");
    return Number(digitsOnly) || 0;
}

function formatMoney(value) {
    const amount = toNumber(value);

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

function extractList(payload, keys = []) {
    const parsedPayload = parseMaybeJson(payload);

    if (Array.isArray(parsedPayload)) return parsedPayload;

    if (!parsedPayload || typeof parsedPayload !== "object") {
        return [];
    }

    if (parsedPayload.body) {
        const bodyList = extractList(parsedPayload.body, keys);
        if (bodyList.length) return bodyList;
    }

    for (const key of keys) {
        const value = parsedPayload[key];
        if (Array.isArray(value)) return value;

        if (value && typeof value === "object") {
            const nestedList = extractList(value, keys);
            if (nestedList.length) return nestedList;
        }
    }

    return [];
}

function normalizeStatus(status) {
    const normalized = String(status || "pending")
        .trim()
        .toLowerCase();

    if (["pending", "delivering", "done", "cancel"].includes(normalized)) {
        return normalized;
    }

    return "pending";
}

function normalizeCategory(category) {
    if (typeof category === "string") {
        return category.trim() || "Chưa phân loại";
    }

    if (category && typeof category === "object") {
        return (
            pickFirstValue(
                category.name,
                category.title,
                category.label,
                category.categoryName
            ) || "Chưa phân loại"
        );
    }

    return "Chưa phân loại";
}

function normalizeProduct(product, index) {
    return {
        id: pickFirstValue(product.id, product.productId, index + 1),
        name: pickFirstValue(product.name, product.productName, "Chưa có tên"),
        category: normalizeCategory(
            pickFirstValue(
                product.category,
                product.categoryName,
                product.productCategory
            )
        ),
        price: toNumber(
            pickFirstValue(
                product.price,
                product.salePrice,
                product.sellingPrice,
                0
            )
        ),
        remaining: toNumber(
            pickFirstValue(
                product.remaining,
                product.stock,
                product.quantity,
                0
            )
        ),
    };
}

function normalizeCustomer(customer, index) {
    return {
        id: pickFirstValue(customer.id, customer.customerId, index + 1),
        name: pickFirstValue(customer.name, "Chưa có tên"),
    };
}

function normalizeOrder(order, index) {
    const product = order.product || {};
    const customer = order.customer || {};

    const amount = toNumber(pickFirstValue(order.amount, order.quantity, 0));
    const productPrice = toNumber(
        pickFirstValue(product.price, order.price, 0)
    );

    return {
        id: pickFirstValue(order.id, order.orderId, index + 1),
        status: normalizeStatus(order.status),
        amount,
        total: toNumber(
            pickFirstValue(
                order.total,
                order.totalAmount,
                order.finalPrice,
                amount * productPrice
            )
        ),
        productId: pickFirstValue(product.id, order.productId, null),
        productName: pickFirstValue(
            product.name,
            order.productName,
            "Chưa có sản phẩm"
        ),
        customerId: pickFirstValue(customer.id, order.customerId, null),
        createdAt: pickFirstValue(
            order.createdAt,
            order.date,
            order.orderDate,
            null
        ),
    };
}

function getFilteredOrdersByDate() {
    const fromInput = document.getElementById("reportDateFrom");
    const toInput = document.getElementById("reportDateTo");

    const fromValue = fromInput?.value ? new Date(fromInput.value) : null;
    const toValue = toInput?.value ? new Date(toInput.value) : null;

    if (toValue) {
        toValue.setHours(23, 59, 59, 999);
    }

    return state.orders.filter((order) => {
        if (!order.createdAt) return true;

        const orderDate = new Date(order.createdAt);
        if (Number.isNaN(orderDate.getTime())) return true;

        if (fromValue && orderDate < fromValue) return false;
        if (toValue && orderDate > toValue) return false;

        return true;
    });
}

function renderStats(orders) {
    const root = document.getElementById("report-stats-root");
    if (!root) return;

    const revenue = orders
        .filter((order) => order.status === "done")
        .reduce((sum, order) => sum + order.total, 0);

    const totalOrders = orders.length;
    const estimatedProfit = Math.round(revenue * 0.2);
    const newCustomers = state.customers.length;

    root.innerHTML = `
        <div class="stat-card">
            <h4>Doanh thu</h4>
            <div class="value">${formatMoney(revenue)}</div>
            <div class="trend up"><i class="fas fa-arrow-up"></i> Tính từ dữ liệu hiện có</div>
        </div>
        <div class="stat-card">
            <h4>Đơn hàng</h4>
            <div class="value">${totalOrders}</div>
            <div class="trend up"><i class="fas fa-arrow-up"></i> Tổng số đơn trong khoảng lọc</div>
        </div>
        <div class="stat-card">
            <h4>Lợi nhuận</h4>
            <div class="value">${formatMoney(estimatedProfit)}</div>
            <div class="trend up"><i class="fas fa-arrow-up"></i> Ước tính 20% doanh thu</div>
        </div>
        <div class="stat-card">
            <h4>Khách mới</h4>
            <div class="value">${newCustomers}</div>
            <div class="trend up"><i class="fas fa-arrow-up"></i> Tổng khách hàng hiện có</div>
        </div>
    `;
}

function groupRevenueLast7Days(orders) {
    const today = new Date();
    const labels = [];
    const dailyRevenue = [];
    const totals = [];

    for (let i = 6; i >= 0; i -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const label = date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
        });

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const dayRevenue = orders
            .filter((order) => {
                if (order.status !== "done") return false;
                if (!order.createdAt) return false;

                const orderDate = new Date(order.createdAt);
                if (Number.isNaN(orderDate.getTime())) return false;

                return orderDate >= start && orderDate <= end;
            })
            .reduce((sum, order) => sum + toNumber(order.total), 0);

        labels.push(label);
        dailyRevenue.push(dayRevenue);
    }

    let cumulativeRevenue = 0;
    for (const revenue of dailyRevenue) {
        cumulativeRevenue += revenue;
        totals.push(cumulativeRevenue);
    }

    return { labels, totals };
}

function renderRevenueChart(orders) {
    const canvas = document.getElementById("revenueChart");
    if (!canvas || typeof Chart === "undefined") return;

    const { labels, totals } = groupRevenueLast7Days(orders);

    if (state.revenueChart) {
        state.revenueChart.destroy();
    }

    state.revenueChart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Doanh thu lũy kế (VNĐ)",
                    data: totals,
                    borderColor: "#3498db",
                    backgroundColor: "rgba(52, 152, 219, 0.12)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${formatMoney(context.raw)}`;
                        },
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return (
                                new Intl.NumberFormat("vi-VN").format(value) +
                                " đ"
                            );
                        },
                    },
                },
            },
        },
    });
}

function getCategoryBreakdown(orders) {
    const map = new Map();

    orders.forEach((order) => {
        const product = state.products.find(
            (item) => String(item.id) === String(order.productId)
        );
        const category = product?.category || "Khác";

        map.set(category, (map.get(category) || 0) + order.amount);
    });

    const labels = Array.from(map.keys());
    const values = Array.from(map.values());

    return { labels, values };
}

function renderCategoryChart(orders) {
    const canvas = document.getElementById("categoryChart");
    if (!canvas || typeof Chart === "undefined") return;

    const { labels, values } = getCategoryBreakdown(orders);

    if (state.categoryChart) {
        state.categoryChart.destroy();
    }

    state.categoryChart = new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["Chưa có dữ liệu"],
            datasets: [
                {
                    data: values.length ? values : [1],
                    backgroundColor: [
                        "#3498db",
                        "#2ecc71",
                        "#f1c40f",
                        "#9b59b6",
                        "#e67e22",
                        "#1abc9c",
                    ],
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        },
    });
}

function getTopProducts(orders) {
    const map = new Map();

    orders.forEach((order) => {
        const product = state.products.find(
            (item) => String(item.id) === String(order.productId)
        );

        const key = String(order.productId || order.productName);
        const current = map.get(key) || {
            name: order.productName,
            sold: 0,
            revenue: 0,
            remaining: product?.remaining ?? 0,
        };

        current.name = product?.name || order.productName;
        current.sold += order.amount;
        current.revenue += order.total;
        current.remaining = product?.remaining ?? current.remaining;

        map.set(key, current);
    });

    return Array.from(map.values())
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10)
        .map((item) => ({
            ...item,
            status:
                item.remaining > 10
                    ? { label: "Còn hàng", color: "#2ecc71" }
                    : { label: "Sắp hết", color: "#e74c3c" },
        }));
}

function renderTopProductsTable(orders) {
    renderTable({
        containerId: "top-products-root",
        title: "Sản phẩm bán chạy nhất",
        columns: topProductColumns,
        rows: getTopProducts(orders),
        tableId: "top-products-table",
        emptyMessage: "Không có dữ liệu sản phẩm",
    });
}

async function loadReportsData() {
    try {
        const [ordersResponse, productsResponse, customersResponse] =
            await Promise.all([
                api.get(ordersEndpoint),
                api.get(productsEndpoint),
                api.get(customersEndpoint),
            ]);

        state.orders = extractList(ordersResponse, [
            "data",
            "items",
            "orders",
            "result",
            "results",
        ]).map(normalizeOrder);

        state.products = extractList(productsResponse, [
            "data",
            "items",
            "products",
            "result",
            "results",
        ]).map(normalizeProduct);

        state.customers = extractList(customersResponse, [
            "data",
            "items",
            "customers",
            "result",
            "results",
        ]).map(normalizeCustomer);

        applyFilters();
    } catch (error) {
        console.error("Không thể tải dữ liệu báo cáo:", error);
        renderStats([]);
        renderTopProductsTable([]);
    }
}

function applyFilters() {
    const filteredOrders = getFilteredOrdersByDate();

    renderStats(filteredOrders);
    renderRevenueChart(filteredOrders);
    renderCategoryChart(filteredOrders);
    renderTopProductsTable(filteredOrders);
}

function setupFilters() {
    const filterBtn = document.getElementById("btnFilterReports");
    const fromInput = document.getElementById("reportDateFrom");
    const toInput = document.getElementById("reportDateTo");

    if (filterBtn) {
        filterBtn.addEventListener("click", applyFilters);
    }

    [fromInput, toInput].forEach((input) => {
        if (!input) return;
        input.addEventListener("change", applyFilters);
    });
}

async function initReportsPage() {
    if (!document.getElementById("report-stats-root")) return;

    setupFilters();
    await loadReportsData();
}

if (document.readyState !== "loading") {
    initReportsPage();
} else {
    document.addEventListener("DOMContentLoaded", initReportsPage);
}
