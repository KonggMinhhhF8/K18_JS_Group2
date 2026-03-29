import { api } from "../../js/api.js";

const customersEndpoint = "/customers";

const state = {
    customer: null,
    avatarPreview: "",
};

function parseMaybeJson(value) {
    if (typeof value !== "string") return value;

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function getEditingCustomer() {
    try {
        return JSON.parse(sessionStorage.getItem("editingCustomer") || "null");
    } catch {
        return null;
    }
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

function renderCurrentRankBadge(rank) {
    const root = document.getElementById("customerCurrentRank");
    if (!root) return;

    const normalizedRank = normalizeRank(rank);

    const labelMap = {
        GOLD: "VÀNG",
        SILVER: "BẠC",
        BRONZE: "ĐỒNG",
    };

    const classMap = {
        GOLD: "badge badge-gold",
        SILVER: "badge badge-silver",
        BRONZE: "badge badge-bronze",
    };

    root.innerHTML = `<span class="${classMap[normalizedRank]}">${labelMap[normalizedRank]}</span>`;
}

function renderAvatar(customer) {
    const preview = document.getElementById("avatarPreview");
    const placeholder = document.getElementById("avatarPlaceholder");

    if (!preview || !placeholder) return;

    const imageUrl =
        state.avatarPreview || customer.avatar || customer.image || "";

    if (imageUrl) {
        preview.src = imageUrl;
        preview.style.display = "block";
        placeholder.style.display = "none";
    } else {
        preview.src = "";
        preview.style.display = "none";
        placeholder.style.display = "flex";
        placeholder.textContent = getInitials(customer.name);
    }
}

function fillForm(customer) {
    const nameInput = document.getElementById("customerName");
    const idInput = document.getElementById("customerId");
    const emailInput = document.getElementById("customerEmail");
    const phoneInput = document.getElementById("customerPhone");
    const addressInput = document.getElementById("customerAddress");
    const noteInput = document.getElementById("customerNote");
    const rankInput = document.getElementById("customerRank");
    const statusInput = document.getElementById("customerStatus");
    const ordersNode = document.getElementById("customerOrders");
    const spendingNode = document.getElementById("customerTotalSpending");

    if (nameInput) nameInput.value = customer.name || "";
    if (idInput) idInput.value = customer.id || "";
    if (emailInput) emailInput.value = customer.email || "";
    if (phoneInput) phoneInput.value = customer.phone || "";
    if (addressInput) addressInput.value = customer.address || "";
    if (noteInput) noteInput.value = customer.note || "";
    if (rankInput) rankInput.value = normalizeRank(customer.rank);
    if (statusInput) statusInput.value = customer.status || "ACTIVE";
    if (ordersNode) ordersNode.textContent = `${customer.orders || 0} đơn`;
    if (spendingNode)
        spendingNode.textContent = formatMoney(customer.totalSpending || 0);

    renderCurrentRankBadge(customer.rank);
    renderAvatar(customer);
}

function setupBackActions() {
    const backButton = document.getElementById("btnBackToCustomers");
    const cancelButton = document.getElementById("btnCancelEditCustomer");

    if (backButton) {
        backButton.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = "./index.html";
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            window.location.href = "./index.html";
        });
    }
}

function setupAvatarPreview() {
    window.previewAvatar = function (event) {
        const file = event?.target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            state.avatarPreview = e.target?.result || "";
            renderAvatar({
                ...state.customer,
                avatar: state.avatarPreview,
            });
        };
        reader.readAsDataURL(file);
    };
}

async function updateCustomerApi(customerId, formValues) {
    const payload = {
        name: formValues.name,
        email: formValues.email,
        phone: formValues.phone,
        address: formValues.address,
        rank: formValues.rank,
    };

    return api.put(`${customersEndpoint}/${customerId}`, payload);
}

function setupSubmit() {
    const form = document.getElementById("customerForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!state.customer?.id) {
            alert("Không tìm thấy khách hàng để cập nhật");
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');

        const formValues = {
            name: document.getElementById("customerName")?.value?.trim() || "",
            email:
                document.getElementById("customerEmail")?.value?.trim() || "",
            phone:
                document.getElementById("customerPhone")?.value?.trim() || "",
            address:
                document.getElementById("customerAddress")?.value?.trim() || "",
            note: document.getElementById("customerNote")?.value?.trim() || "",
            rank: document.getElementById("customerRank")?.value || "BRONZE",
            status:
                document.getElementById("customerStatus")?.value || "ACTIVE",
        };

        if (!formValues.name || !formValues.email) {
            alert("Vui lòng nhập tên và email");
            return;
        }

        try {
            if (submitButton) submitButton.disabled = true;

            await updateCustomerApi(state.customer.id, formValues);

            const updatedCustomer = {
                ...state.customer,
                ...formValues,
                avatar: state.avatarPreview || state.customer.avatar || "",
            };

            sessionStorage.setItem(
                "editingCustomer",
                JSON.stringify(updatedCustomer)
            );

            alert("Cập nhật khách hàng thành công");
            window.location.href = "./index.html";
        } catch (error) {
            console.error("Không thể cập nhật khách hàng:", error);
            alert(error?.message || "Cập nhật khách hàng thất bại");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

function initEditCustomerPage() {
    const customer = getEditingCustomer();

    if (!customer) {
        alert("Không tìm thấy dữ liệu khách hàng để chỉnh sửa");
        window.location.href = "./index.html";
        return;
    }

    state.customer = parseMaybeJson(customer);
    setupBackActions();
    setupAvatarPreview();
    fillForm(state.customer);
    setupSubmit();
}

if (document.readyState !== "loading") {
    initEditCustomerPage();
} else {
    document.addEventListener("DOMContentLoaded", initEditCustomerPage);
}
