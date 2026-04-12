import { openModal, closeModal } from "../../js/components/modal.js";
import { renderSidebar } from "../../js/components/sidebar.js";
import { renderTable } from "../../js/components/table.js";
import { api } from "../../js/api.js";

const container = document.querySelector(".container");
container.insertAdjacentHTML(
    "afterbegin",
    renderSidebar("customers", "../../")
);

const modalId = "customerModal";
const customersEndpoint = "/customers";

const state = {
    allCustomers: [],
    searchTerm: "",
    selectedRank: "ALL",
    loadError: "",
    editingCustomerId: null,
};

const rankLabelMap = {
    GOLD: "VÀNG",
    SILVER: "BẠC",
    BRONZE: "ĐỒNG",
};

const rankClassMap = {
    GOLD: "gold",
    SILVER: "silver",
    BRONZE: "bronze",
};

const columns = [
    {
        key: "customer",
        label: "Khách hàng",
        render: (_, row) => createCustomerInfo(row),
    },
    {
        key: "contact",
        label: "Liên hệ",
        render: (_, row) => createContactInfo(row),
    },
    {
        key: "rank",
        label: "Hạng",
        render: (value) => createRankBadge(value),
    },
    {
        key: "orders",
        label: "Đơn hàng",
        render: (value) => `${value ?? 0}`,
    },
    {
        key: "totalSpending",
        label: "Tổng chi tiêu",
        render: (value) => createSpendingNode(value),
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

function extractCustomerList(payload) {
    const parsedPayload = parseMaybeJson(payload);

    if (Array.isArray(parsedPayload)) {
        return parsedPayload;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
        return [];
    }

    if (parsedPayload.body) {
        const bodyList = extractCustomerList(parsedPayload.body);
        if (bodyList.length) return bodyList;
    }

    const possibleKeys = ["data", "items", "customers", "result", "results"];
    for (const key of possibleKeys) {
        const value = parsedPayload[key];
        if (Array.isArray(value)) return value;

        if (value && typeof value === "object") {
            const nestedList = extractCustomerList(value);
            if (nestedList.length) return nestedList;
        }
    }

    return [];
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

function normalizeRank(rank) {
    const normalized = String(rank || "BRONZE")
        .trim()
        .toUpperCase();
    if (["GOLD", "SILVER", "BRONZE"].includes(normalized)) {
        return normalized;
    }
    return "BRONZE";
}

function getInitials(name = "") {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "KH";

    return words
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() || "")
        .join("");
}

function getAvatarColors(rank) {
    const map = {
        GOLD: { background: "#ebf5fb", color: "#3498db" },
        SILVER: { background: "#fdf2e9", color: "#e67e22" },
        BRONZE: { background: "#f4f6f7", color: "#7f8c8d" },
    };

    return map[normalizeRank(rank)] || map.BRONZE;
}

function normalizeCustomer(customer, index) {
    return {
        id: pickFirstValue(
            customer.id,
            customer.customerId,
            `CUST-${String(index + 1).padStart(3, "0")}`
        ),
        name: pickFirstValue(customer.name, "Chưa có tên"),
        email: pickFirstValue(customer.email, ""),
        phone: pickFirstValue(customer.phone, ""),
        address: pickFirstValue(customer.address, ""),
        rank: normalizeRank(customer.rank),
        orders: toNumber(
            pickFirstValue(
                customer.orders,
                customer.totalOrders,
                customer.orderCount,
                0
            )
        ),
        totalSpending: toNumber(
            pickFirstValue(
                customer.totalSpending,
                customer.spending,
                customer.totalSpent,
                0
            )
        ),
    };
}

function createCustomerInfo(customer) {
    const wrapper = document.createElement("div");
    wrapper.className = "cust-info";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const colors = getAvatarColors(customer.rank);
    avatar.style.background = colors.background;
    avatar.style.color = colors.color;
    avatar.textContent = getInitials(customer.name);

    const info = document.createElement("div");

    const strong = document.createElement("strong");
    strong.textContent = customer.name;

    const small = document.createElement("small");
    small.textContent = `ID: ${customer.id}`;

    info.appendChild(strong);
    info.appendChild(document.createElement("br"));
    info.appendChild(small);

    wrapper.appendChild(avatar);
    wrapper.appendChild(info);

    return wrapper;
}

function createContactInfo(customer) {
    const wrapper = document.createElement("div");

    const email = document.createElement("div");
    email.textContent = customer.email || "Chưa có email";

    const phone = document.createElement("small");
    phone.textContent = customer.phone || "Chưa có số điện thoại";

    wrapper.appendChild(email);
    wrapper.appendChild(phone);

    return wrapper;
}

function createRankBadge(rank) {
    const normalizedRank = normalizeRank(rank);

    const span = document.createElement("span");
    span.className = `tier ${rankClassMap[normalizedRank]}`;
    span.textContent = rankLabelMap[normalizedRank];

    return span;
}

function createSpendingNode(value) {
    const strong = document.createElement("strong");
    strong.textContent = formatMoney(value);
    return strong;
}

function createActionButtons(customer) {
    const wrapper = document.createElement("div");

    const historyBtn = document.createElement("button");
    historyBtn.className = "btn-action";
    historyBtn.type = "button";
    historyBtn.title = "Lịch sử mua hàng";
    historyBtn.innerHTML = '<i class="fas fa-history"></i>';
    historyBtn.addEventListener("click", () => {
        console.log("Lịch sử mua hàng:", customer.id);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "btn-action";
    editBtn.type = "button";
    editBtn.title = "Sửa";
    editBtn.innerHTML = '<i class="fas fa-user-edit"></i>';
    editBtn.addEventListener("click", () => {
        openEditModal(customer);
    });

    wrapper.appendChild(historyBtn);
    wrapper.appendChild(editBtn);

    return wrapper;
}

function renderStats() {
    const root = document.getElementById("customers-stats-root");
    if (!root) return;

    const totalCustomers = state.allCustomers.length;
    const newThisMonth = state.allCustomers.length;
    const returningRate = totalCustomers ? 65 : 0;

    root.innerHTML = `
        <div class="card">
            <h3>Tổng khách hàng</h3>
            <p>${totalCustomers}</p>
        </div>
        <div class="card">
            <h3>Khách hàng mới (Tháng)</h3>
            <p>${newThisMonth}</p>
        </div>
        <div class="card">
            <h3>Tỉ lệ quay lại</h3>
            <p>${returningRate}%</p>
        </div>
    `;
}

function createRankFilter() {
    const wrapper = document.createElement("div");

    const select = document.createElement("select");
    select.style.padding = "8px";
    select.style.borderRadius = "5px";
    select.style.border = "1px solid #ddd";

    const options = [
        { value: "ALL", label: "Hạng: Tất cả" },
        { value: "GOLD", label: "Hạng: Vàng" },
        { value: "SILVER", label: "Hạng: Bạc" },
        { value: "BRONZE", label: "Hạng: Đồng" },
    ];

    options.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        select.appendChild(option);
    });

    select.value = state.selectedRank;
    select.addEventListener("change", (event) => {
        state.selectedRank = event.target.value;
        renderCustomersTable();
    });

    wrapper.appendChild(select);
    return wrapper;
}

function getFilteredCustomers() {
    const keyword = state.searchTerm.trim().toLowerCase();

    return state.allCustomers.filter((customer) => {
        const matchKeyword =
            !keyword ||
            [customer.name, customer.email, customer.phone].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(keyword)
            );

        const matchRank =
            state.selectedRank === "ALL" ||
            customer.rank === state.selectedRank;

        return matchKeyword && matchRank;
    });
}

function getEmptyMessage() {
    if (state.loadError) return state.loadError;
    if (state.allCustomers.length && !getFilteredCustomers().length) {
        return "Không tìm thấy khách hàng phù hợp";
    }
    return "Không có khách hàng";
}

function renderCustomersTable() {
    renderTable({
        containerId: "customers-table-root",
        title: "Danh sách khách hàng",
        columns,
        rows: getFilteredCustomers(),
        tableId: "customers-table",
        headerActions: createRankFilter(),
        emptyMessage: getEmptyMessage(),
    });
}

async function loadCustomers() {
    state.loadError = "";

    renderTable({
        containerId: "customers-table-root",
        title: "Danh sách khách hàng",
        columns,
        rows: [],
        tableId: "customers-table",
        headerActions: createRankFilter(),
        emptyMessage: "Đang tải dữ liệu khách hàng...",
    });

    try {
        const response = await api.get(customersEndpoint);
        state.allCustomers =
            extractCustomerList(response).map(normalizeCustomer);
        renderStats();
        renderCustomersTable();
    } catch (error) {
        console.error("Không thể tải danh sách khách hàng:", error);
        state.allCustomers = [];
        state.loadError = "Không tải được dữ liệu khách hàng từ API";
        renderStats();
        renderCustomersTable();
    }
}

function resetCustomerForm() {
    const form = document.getElementById("customerForm");
    if (form) form.reset();

    state.editingCustomerId = null;
    updateModalMode();
}

function updateModalMode() {
    const modalTitle = document.getElementById("customerModalTitle");
    const submitButton = document.getElementById("customerSubmitButton");
    const isEditing = Boolean(state.editingCustomerId);

    if (modalTitle) {
        modalTitle.textContent = isEditing
            ? "Chỉnh sửa khách hàng"
            : "Thêm khách hàng mới";
    }

    if (submitButton) {
        submitButton.textContent = isEditing
            ? "Lưu thay đổi"
            : "Lưu khách hàng";
    }
}

function fillCustomerForm(customer) {
    const nameInput = document.getElementById("custName");
    const emailInput = document.getElementById("custEmail");
    const phoneInput = document.getElementById("custPhone");
    const addressInput = document.getElementById("custAddress");

    if (nameInput) nameInput.value = customer.name || "";
    if (emailInput) emailInput.value = customer.email || "";
    if (phoneInput) phoneInput.value = customer.phone || "";
    if (addressInput) addressInput.value = customer.address || "";
}

function openCreateModal() {
    resetCustomerForm();
    openModal(modalId);
}

function openEditModal(customer) {
    if (!customer) return;

    resetCustomerForm();
    state.editingCustomerId = customer.id;
    fillCustomerForm(customer);
    updateModalMode();
    openModal(modalId);
}

async function createCustomerApi(customerData) {
    const payload = {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        rank: "BRONZE",
    };

    return api.post(customersEndpoint, payload);
}

async function updateCustomerApi(customerId, customerData, currentCustomer) {
    const payload = {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        rank: currentCustomer?.rank || "BRONZE",
    };

    return api.put(`${customersEndpoint}/${customerId}`, payload);
}

function buildCreatedCustomer(formValues, response) {
    const parsedResponse = parseMaybeJson(response);

    if (
        parsedResponse &&
        typeof parsedResponse === "object" &&
        !Array.isArray(parsedResponse)
    ) {
        return normalizeCustomer(parsedResponse, 0);
    }

    return normalizeCustomer(
        {
            id: `CUST-${Date.now()}`,
            name: formValues.name,
            email: formValues.email,
            phone: formValues.phone,
            address: formValues.address,
            rank: "BRONZE",
            orders: 0,
            totalSpending: 0,
        },
        0
    );
}

function buildUpdatedCustomer(currentCustomer, formValues, response) {
    const parsedResponse = parseMaybeJson(response);

    if (
        parsedResponse &&
        typeof parsedResponse === "object" &&
        !Array.isArray(parsedResponse)
    ) {
        return normalizeCustomer(
            {
                ...currentCustomer,
                ...parsedResponse,
                name: parsedResponse.name ?? formValues.name,
                email: parsedResponse.email ?? formValues.email,
                phone: parsedResponse.phone ?? formValues.phone,
                address: parsedResponse.address ?? formValues.address,
                rank: parsedResponse.rank ?? currentCustomer.rank,
            },
            0
        );
    }

    return {
        ...currentCustomer,
        name: formValues.name,
        email: formValues.email,
        phone: formValues.phone,
        address: formValues.address,
    };
}

function setupModal() {
    const addButton = document.getElementById("btnAddCustomer");
    const closeButton = document.getElementById("btnCloseCustomer");
    const form = document.getElementById("customerForm");

    if (addButton) {
        addButton.addEventListener("click", () => {
            openCreateModal();
        });
    }

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            resetCustomerForm();
            closeModal(modalId);
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitButton = form.querySelector('button[type="submit"]');

            const formValues = {
                name: document.getElementById("custName")?.value?.trim() || "",
                email:
                    document.getElementById("custEmail")?.value?.trim() || "",
                phone:
                    document.getElementById("custPhone")?.value?.trim() || "",
                address:
                    document.getElementById("custAddress")?.value?.trim() || "",
            };

            if (!formValues.name || !formValues.email) {
                alert("Vui lòng nhập tên và email");
                return;
            }

            const isEditing = Boolean(state.editingCustomerId);
            const currentCustomer = state.allCustomers.find(
                (item) => String(item.id) === String(state.editingCustomerId)
            );

            try {
                if (submitButton) submitButton.disabled = true;

                if (isEditing && currentCustomer) {
                    const response = await updateCustomerApi(
                        state.editingCustomerId,
                        formValues,
                        currentCustomer
                    );

                    const updatedCustomer = buildUpdatedCustomer(
                        currentCustomer,
                        formValues,
                        response
                    );

                    state.allCustomers = state.allCustomers.map((item) =>
                        String(item.id) === String(state.editingCustomerId)
                            ? updatedCustomer
                            : item
                    );

                    alert("Cập nhật khách hàng thành công");
                } else {
                    const response = await createCustomerApi(formValues);
                    const createdCustomer = buildCreatedCustomer(
                        formValues,
                        response
                    );

                    state.allCustomers = [
                        createdCustomer,
                        ...state.allCustomers,
                    ];

                    alert("Thêm khách hàng thành công");
                }

                renderStats();
                renderCustomersTable();
                resetCustomerForm();
                closeModal(modalId);
            } catch (error) {
                console.error("Không thể lưu khách hàng:", error);
                alert(error?.message || "Lưu khách hàng thất bại");
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }
}

function setupSearch() {
    const input = document.getElementById("customerSearchInput");
    if (!input) return;

    input.addEventListener("input", (event) => {
        state.searchTerm = event.target.value;
        renderCustomersTable();
    });
}

async function initCustomersPage() {
    if (!document.getElementById("customers-table-root")) return;

    setupSearch();
    setupModal();
    await loadCustomers();
}

if (document.readyState !== "loading") {
    initCustomersPage();
} else {
    document.addEventListener("DOMContentLoaded", initCustomersPage);
}
