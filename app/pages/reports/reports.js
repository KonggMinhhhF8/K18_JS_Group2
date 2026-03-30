import { renderSidebar } from "../../js/components/sidebar.js";
import { renderSummary } from "../../js/components/summary.js";
import { renderTable } from "../../js/components/table.js";
import { api } from "../../js/api.js";

const container = document.querySelector(".container");

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

const reportsEndpoint = "/reports";

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
    if (status === "Còn hàng" || status === "In Stock") {
        span.style.color = "#2ecc71";
        span.style.fontWeight = "bold";
    } else if (status === "Sắp hết" || status === "Low Stock") {
        span.style.color = "#e74c3c";
        span.style.fontWeight = "bold";
    } else {
        span.style.color = "#7f8c8d";
    }
    span.textContent = status || "Không rõ";
    return span;
}

const columns = [
    { key: "name", label: "Sản phẩm" },
    { key: "quantity", label: "Số lượng bán" },
    { key: "revenue", label: "Doanh thu", render: (value) => formatMoney(value) },
    { key: "status", label: "Tình trạng", render: (value) => createStatusNode(value) }
];

// Render the interface.
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
        emptyMessage: "Không có dữ liệu sản phẩm trong khoảng thời gian này."
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
            labels: state.chartData.revenue.labels || [],
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: state.chartData.revenue.data || [],
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
                    suggestedMax: 28000000,
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
            labels: state.chartData.categories.labels || [],
            datasets: [{
                data: state.chartData.categories.data || [],
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

// Main logic call API
async function loadReports() {
    try {
        const startDate = document.getElementById("startDate")?.value || "";
        const endDate = document.getElementById("endDate")?.value || "";

        const endpoint = `${reportsEndpoint}?startDate=${startDate}&endDate=${endDate}`;

        const response = await api.get(endpoint);

        const payload = response.data || response.body || response;

        state.summaryStats = payload.summary || [];
        state.topProducts = payload.topProducts || [];
        state.chartData = payload.chartData || {
            revenue: { labels: [], data: [] },
            categories: { labels: [], data: [] }
        };

        updateSummaryComponent();
        renderCharts();
        updateTopProductsTable();

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu báo cáo từ API:", error);

        state.summaryStats = [];
        state.topProducts = [];
        state.chartData = {
            revenue: { labels: [], data: [] },
            categories: { labels: [], data: [] }
        };

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