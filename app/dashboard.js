import { renderSidebar } from "./js/components/sidebar.js";
import { renderTable } from "./js/components/table.js";
import { api } from "./js/api.js";

const container = document.querySelector(".container");
container.insertAdjacentHTML("afterbegin", renderSidebar("dashboard"));

const userTrigger = document.getElementById("userTrigger");
const logoutBtn = document.getElementById("logoutBtn");

const ordersEndpoint = "/orders";

const state = {
    recentOrders: [],
    loadError: "",
};

const columns = [
    {
        key: "code",
        label: "Mã đơn",
        render: (_, row) => {
            const strong = document.createElement("strong");
            strong.textContent = row.code;
            return strong;
        },
    },
    {
        key: "customer",
        label: "Khách hàng",
        render: (_, row) => {
            const span = document.createElement("span");
            span.textContent = row.customerName;
            return span;
        },
    },
    {
        key: "status",
        label: "Trạng thái",
        render: (value) => createStatusBadge(value),
    },
    {
        key: "total",
        label: "Tổng tiền",
        render: (value) => formatMoney(value),
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

function extractOrderList(payload) {
    const parsedPayload = parseMaybeJson(payload);

    if (Array.isArray(parsedPayload)) {
        return parsedPayload;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
        return [];
    }

    if (parsedPayload.body) {
        const bodyList = extractOrderList(parsedPayload.body);
        if (bodyList.length) return bodyList;
    }

    const possibleKeys = ["data", "items", "orders", "result", "results"];
    for (const key of possibleKeys) {
        const value = parsedPayload[key];

        if (Array.isArray(value)) {
            return value;
        }

        if (value && typeof value === "object") {
            const nestedList = extractOrderList(value);
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

function normalizeOrder(order, index) {
    const product = order.product || {};
    const customer = order.customer || {};

    const amount = toNumber(pickFirstValue(order.amount, order.quantity, 0));
    const productPrice = toNumber(
        pickFirstValue(product.price, order.price, 0)
    );

    return {
        id: pickFirstValue(order.id, order.orderId, index + 1),
        code: `#${pickFirstValue(order.id, order.orderId, index + 1)}`,
        customerName: pickFirstValue(
            customer.name,
            order.customerName,
            "Chưa có khách hàng"
        ),
        status: normalizeStatus(order.status),
        total: amount * productPrice,
        raw: order,
    };
}

function createStatusBadge(status) {
    const normalized = normalizeStatus(status);

    const labelMap = {
        pending: "Chờ xử lý",
        delivering: "Đang giao",
        done: "Thành công",
        cancel: "Đã hủy",
    };

    const classMap = {
        pending: "status pending",
        delivering: "status delivering",
        done: "status done",
        cancel: "status cancel",
    };

    const span = document.createElement("span");
    span.className = classMap[normalized];
    span.textContent = labelMap[normalized];
    return span;
}

function renderStats(orders) {
    const statsRoot = document.getElementById("dashboard-stats-root");
    if (!statsRoot) return;

    const totalRevenue = orders
        .filter((order) => order.status === "done")
        .reduce((sum, order) => sum + order.total, 0);

    const totalNewOrders = orders.length;

    statsRoot.innerHTML = `
        <div class="card">
            <h3>Doanh thu</h3>
            <p>${formatMoney(totalRevenue)}</p>
        </div>
        <div class="card">
            <h3>Đơn mới</h3>
            <p>${totalNewOrders}</p>
        </div>
    `;
}

function renderRecentOrdersTable() {
    renderTable({
        containerId: "dashboard-orders-root",
        title: "Đơn hàng gần đây",
        columns,
        rows: state.recentOrders,
        tableId: "dashboard-orders-table",
        emptyMessage: state.loadError || "Không có đơn hàng gần đây",
    });
}

async function loadDashboardData() {
    try {
        const response = await api.get(ordersEndpoint);
        const allOrders = extractOrderList(response).map(normalizeOrder);

        state.recentOrders = [...allOrders]
            .sort((a, b) => Number(b.id) - Number(a.id))
            .slice(0, 8);

        renderStats(allOrders);
        renderRecentOrdersTable();
    } catch (error) {
        console.error("Không thể tải dữ liệu dashboard:", error);
        state.recentOrders = [];
        state.loadError = "Không tải được dữ liệu dashboard";
        renderStats([]);
        renderRecentOrdersTable();
    }
}

function setupUserMenu() {
    if (userTrigger && logoutBtn) {
        userTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            logoutBtn.classList.toggle("show");
        });

        document.addEventListener("click", (e) => {
            const isClickInsideHeaderActions =
                e.target.closest(".header-actions");

            if (!isClickInsideHeaderActions) {
                logoutBtn.classList.remove("show");
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "../app/login.html";
        });
    }
}

async function initDashboard() {
    if (!document.getElementById("dashboard-orders-root")) return;

    setupUserMenu();
    await loadDashboardData();
}

if (document.readyState !== "loading") {
    initDashboard();
} else {
    document.addEventListener("DOMContentLoaded", initDashboard);
}
