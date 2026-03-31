import { renderSidebar } from "../../js/components/sidebar.js";
import { renderSummary } from "../../js/components/summary.js";
import { renderTable } from "../../js/components/table.js";
import { api } from "../../js/api.js";

const container = document.querySelector(".container");

// Render Sidebar
container.insertAdjacentHTML("afterbegin", renderSidebar("reports"));

const state = {
    summaryStats: [],
    chartData: {
        revenue: { labels: [], data: [] },
        categories: { labels: [], data: [] }
    },
    topProducts: [],
    isLoading: false
};

const ordersEndpoint = "/orders";

// Formatter
function formatMoney(value) {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

function createStatusNode(status) {
    const span = document.createElement("span");
    if (status === "Còn hàng") {
        span.style.color = "#2ecc71";
        span.style.fontWeight = "bold";
    } else {
        span.style.color = "#e74c3c";
        span.style.fontWeight = "bold";
    }
    span.textContent = status;
    return span;
}

const columns = [
    { key: "name", label: "Sản phẩm" },
    { key: "quantity", label: "Số lượng bán" },
    { key: "revenue", label: "Doanh thu", render: (value) => formatMoney(value) },
    { key: "status", label: "Tình trạng", render: (value) => createStatusNode(value) }
];


// Render the interface
function updateSummaryComponent() {
    renderSummary({
        containerId: "reports-summary-root",
        items: state.summaryStats
    });
}

function updateTopProductsTable() {
    renderTable({
        containerId: "top-products-table-root",
        title: "Sản phẩm bán chạy nhất",
        columns: columns,
        rows: state.topProducts,
        tableId: "top-products-table",
        emptyMessage: "Không có phát sinh giao dịch nào trong khoảng thời gian này."
    });
}

// chart.js
let revenueChartInstance = null;
let categoryChartInstance = null;

function renderCharts() {
    const revCtx = document.getElementById("revenueChart");
    const catCtx = document.getElementById("categoryChart");

    if (!revCtx || !catCtx) return;

    if (revenueChartInstance) revenueChartInstance.destroy();
    if (categoryChartInstance) categoryChartInstance.destroy();

    revenueChartInstance = new Chart(revCtx, {
        type: 'line',
        data: {
            labels: state.chartData.revenue.labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: state.chartData.revenue.data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 1000000,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                            }).format(value);
                        }
                    }
                }
            }
        }
    });

    categoryChartInstance = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: state.chartData.categories.labels,
            datasets: [{
                data: state.chartData.categories.data,
                backgroundColor: ['#3498db', '#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6', '#34495e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function processReportData(allOrders, startDateStr, endDateStr) {
    const start = startDateStr ? new Date(startDateStr) : new Date(0);
    const end = endDateStr ? new Date(endDateStr) : new Date();
    end.setHours(23, 59, 59, 999);

    const validOrders = allOrders.filter(order => {
        if (order.status === "cancel") return false;
        if (!order.date) return false;

        const orderDate = new Date(order.date);
        return orderDate >= start && orderDate <= end;
    });

    let totalRevenue = 0;
    let uniqueCustomers = new Set();

    validOrders.forEach(order => {
        const qty = order.amount || 0;
        const price = order.product?.price || 0;
        totalRevenue += (qty * price);

        if (order.customer?.id) {
            uniqueCustomers.add(order.customer.id);
        }
    });

    const estimatedProfit = totalRevenue * 0.25;

    state.summaryStats = [
        { label: "Doanh thu", value: formatMoney(totalRevenue) },
        { label: "Đơn hàng hợp lệ", value: validOrders.length.toString() },
        { label: "Lợi nhuận (Ước tính)", value: formatMoney(estimatedProfit) },
        { label: "Khách mua hàng", value: uniqueCustomers.size.toString() }
    ];

    const revenueByDate = {};
    validOrders.forEach(order => {
        const dateStr = order.date.split('T')[0];
        const rev = (order.amount || 0) * (order.product?.price || 0);
        revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + rev;
    });

    const sortedDates = Object.keys(revenueByDate).sort();
    const last7Dates = sortedDates.slice(-7);

    state.chartData.revenue.labels = last7Dates;
    state.chartData.revenue.data = last7Dates.map(d => revenueByDate[d]);

    const categoryRev = {};
    validOrders.forEach(order => {
        const catName = order.product?.category?.name || 'Khác';
        const rev = (order.amount || 0) * (order.product?.price || 0);
        categoryRev[catName] = (categoryRev[catName] || 0) + rev;
    });

    state.chartData.categories.labels = Object.keys(categoryRev);
    state.chartData.categories.data = Object.values(categoryRev);

    const productStats = {};
    validOrders.forEach(order => {
        const p = order.product;
        if (!p) return;

        if (!productStats[p.id]) {
            productStats[p.id] = {
                name: p.name,
                quantity: 0,
                revenue: 0,
                stock: p.remaining || 0
            };
        }
        productStats[p.id].quantity += (order.amount || 0);
        productStats[p.id].revenue += ((order.amount || 0) * (p.price || 0));
        productStats[p.id].stock = p.remaining || 0;
    });

    state.topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map(p => ({
            name: p.name,
            quantity: p.quantity,
            revenue: p.revenue,
            status: p.stock > 5 ? "Còn hàng" : "Sắp hết"
        }));
}

// Call API
async function loadReports() {
    try {
        const startDate = document.getElementById("startDate")?.value || "";
        const endDate = document.getElementById("endDate")?.value || "";

        const response = await api.get(ordersEndpoint);
        const allOrders = response.data || response.body || response || [];

        processReportData(allOrders, startDate, endDate);

        updateSummaryComponent();
        renderCharts();
        updateTopProductsTable();

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu đơn hàng để báo cáo:", error);
        alert("Có lỗi xảy ra khi lấy dữ liệu báo cáo.");

        state.summaryStats = [];
        state.topProducts = [];
        state.chartData = { revenue: { labels: [], data: [] }, categories: { labels: [], data: [] } };

        updateSummaryComponent();
        renderCharts();
        updateTopProductsTable();
    }
}

function setupFilters() {
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");

    if (startDateInput && endDateInput) {
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        startDateInput.value = firstDayOfMonth;
        endDateInput.value = today;
    }

    const btnFilter = document.getElementById("btnFilter");
    if (btnFilter) {
        btnFilter.addEventListener("click", () => {
            loadReports();
        });
    }
}

async function initReportsPage() {
    if (!document.getElementById("reports-summary-root")) return;
    setupFilters();
    await loadReports();
}

if (document.readyState !== "loading") {
    initReportsPage();
} else {
    document.addEventListener("DOMContentLoaded", initReportsPage);
}