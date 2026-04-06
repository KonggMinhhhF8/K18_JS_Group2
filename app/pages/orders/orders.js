import { renderSidebar } from "../../js/components/sidebar.js";
import { renderTable } from "../../js/components/table.js";
import { api } from "../../js/api.js";

const container = document.querySelector(".container");
container.insertAdjacentHTML("afterbegin", renderSidebar("orders"));

const ordersEndpoint = "/orders";

const state = {
    allOrders: [],
    searchTerm: "",
    selectedStatus: "ALL",
    loadError: "",
};

const statusLabelMap = {
    pending: "CHỜ XỬ LÝ",
    delivering: "ĐANG GIAO",
    done: "HOÀN THÀNH",
    cancel: "ĐÃ HỦY",
};

const statusClassMap = {
    pending: "pending",
    delivering: "delivering",
    done: "done",
    cancel: "cancel",
};

const columns = [
    {
        key: "code",
        label: "Mã đơn",
        render: (_, row) => createOrderCodeNode(row),
    },
    {
        key: "customer",
        label: "Khách hàng",
        render: (_, row) => createCustomerNode(row),
    },
    {
        key: "product",
        label: "Sản phẩm",
        render: (_, row) => createProductNode(row),
    },
    {
        key: "total",
        label: "Tổng tiền",
        render: (value) => formatMoney(value),
    },
    {
        key: "status",
        label: "Trạng thái",
        render: (value) => createStatusBadge(value),
    },
    {
        key: "actions",
        label: "Thao tác",
        render: (_, row) => createActionButtons(row),
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
    const total = amount * productPrice;

    return {
        id: pickFirstValue(order.id, order.orderId, index + 1),
        code: `#ORD-${pickFirstValue(order.id, order.orderId, index + 1000)}`,
        customerName: pickFirstValue(
            customer.name,
            order.customerName,
            "Chưa có khách hàng"
        ),
        customerPhone: pickFirstValue(customer.phone, order.customerPhone, ""),
        customerEmail: pickFirstValue(customer.email, order.customerEmail, ""),
        productName: pickFirstValue(
            product.name,
            order.productName,
            "Chưa có sản phẩm"
        ),
        productSku: pickFirstValue(product.sku, order.productSku, ""),
        amount,
        total,
        status: normalizeStatus(order.status),
        raw: order,
    };
}

function createOrderCodeNode(order) {
    const strong = document.createElement("strong");
    strong.textContent = order.code;
    return strong;
}

function createCustomerNode(order) {
    const wrapper = document.createElement("div");

    const strong = document.createElement("strong");
    strong.textContent = order.customerName;

    const small = document.createElement("small");
    small.textContent = order.customerPhone || order.customerEmail || "";

    wrapper.appendChild(strong);
    wrapper.appendChild(document.createElement("br"));
    wrapper.appendChild(small);

    return wrapper;
}

function createProductNode(order) {
    const span = document.createElement("span");
    span.textContent = `${order.productName} (x${order.amount})`;
    return span;
}

function createStatusBadge(status) {
    const normalizedStatus = normalizeStatus(status);

    const span = document.createElement("span");
    span.className = `order-status ${statusClassMap[normalizedStatus]}`;
    span.textContent = statusLabelMap[normalizedStatus];

    return span;
}

function createActionButtons(order) {
    const wrapper = document.createElement("div");

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn-action";
    viewBtn.type = "button";
    viewBtn.title = "Xem";
    viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
    viewBtn.addEventListener("click", () => {
        console.log("Xem đơn hàng:", order.id);
    });

    const printBtn = document.createElement("button");
    printBtn.className = "btn-action";
    printBtn.type = "button";
    printBtn.title = "In";
    printBtn.innerHTML = '<i class="fas fa-print"></i>';
    printBtn.addEventListener("click", () => {
        console.log("In đơn hàng:", order.id);
    });

    wrapper.appendChild(viewBtn);
    wrapper.appendChild(printBtn);

    return wrapper;
}

function renderStats() {
    const root = document.getElementById("orders-stats-root");
    if (!root) return;

    const totalOrders = state.allOrders.length;
    const pendingOrders = state.allOrders.filter(
        (item) => item.status === "pending"
    ).length;
    const deliveringOrders = state.allOrders.filter(
        (item) => item.status === "delivering"
    ).length;
    const doneOrders = state.allOrders.filter(
        (item) => item.status === "done"
    ).length;
    const cancelOrders = state.allOrders.filter(
        (item) => item.status === "cancel"
    ).length;

    root.innerHTML = `
        <div class="card">
            <h3>Tổng đơn hàng</h3>
            <p>${totalOrders}</p>
        </div>
        <div class="card">
            <h3>Đang xử lý</h3>
            <p>${pendingOrders + deliveringOrders}</p>
        </div>
        <div class="card">
            <h3>Thành công</h3>
            <p>${doneOrders}</p>
        </div>
        <div class="card">
            <h3>Đã hủy</h3>
            <p>${cancelOrders}</p>
        </div>
    `;
}

function createStatusFilter() {
    const wrapper = document.createElement("div");
    wrapper.className = "order-filter-group";

    const options = [
        { value: "ALL", label: "Tất cả" },
        { value: "pending", label: "Chờ xử lý" },
        { value: "delivering", label: "Đang giao" },
        { value: "done", label: "Đã xong" },
        { value: "cancel", label: "Đã hủy" },
    ];

    options.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = item.label;
        button.className =
            state.selectedStatus === item.value
                ? "filter-chip active"
                : "filter-chip";

        button.addEventListener("click", () => {
            state.selectedStatus = item.value;
            renderOrdersTable();
        });

        wrapper.appendChild(button);
    });

    return wrapper;
}

function getFilteredOrders() {
    const keyword = state.searchTerm.trim().toLowerCase();

    return state.allOrders.filter((order) => {
        const matchKeyword =
            !keyword ||
            [order.code, order.customerName, order.productName].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(keyword)
            );

        const matchStatus =
            state.selectedStatus === "ALL" ||
            order.status === state.selectedStatus;

        return matchKeyword && matchStatus;
    });
}

function getEmptyMessage() {
    if (state.loadError) return state.loadError;
    if (state.allOrders.length && !getFilteredOrders().length) {
        return "Không tìm thấy đơn hàng phù hợp";
    }
    return "Không có đơn hàng";
}

function renderOrdersTable() {
    renderTable({
        containerId: "orders-table-root",
        title: "Danh sách đơn hàng",
        columns,
        rows: getFilteredOrders(),
        tableId: "orders-table",
        headerActions: createStatusFilter(),
        emptyMessage: getEmptyMessage(),
    });
}

async function loadOrders() {
    state.loadError = "";

    renderTable({
        containerId: "orders-table-root",
        title: "Danh sách đơn hàng",
        columns,
        rows: [],
        tableId: "orders-table",
        headerActions: createStatusFilter(),
        emptyMessage: "Đang tải dữ liệu đơn hàng...",
    });

    try {
        const response = await api.get(ordersEndpoint);
        state.allOrders = extractOrderList(response).map(normalizeOrder);
        renderStats();
        renderOrdersTable();
    } catch (error) {
        console.error("Không thể tải danh sách đơn hàng:", error);
        state.allOrders = [];
        state.loadError = "Không tải được dữ liệu đơn hàng từ API";
        renderStats();
        renderOrdersTable();
    }
}

function setupSearch() {
    const input = document.getElementById("orderSearchInput");
    if (!input) return;

    input.addEventListener("input", (event) => {
        state.searchTerm = event.target.value;
        renderOrdersTable();
    });
}

async function initOrdersPage() {
    if (!document.getElementById("orders-table-root")) return;

    setupSearch();
    await loadOrders();
}

if (document.readyState !== "loading") {
    initOrdersPage();
} else {
    document.addEventListener("DOMContentLoaded", initOrdersPage);
}
