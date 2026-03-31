import { api } from "../../js/api.js";
import { renderSidebar } from "../../js/components/sidebar.js";
const container = document.querySelector(".container");
container.insertAdjacentHTML("afterbegin", renderSidebar("products"));

const productsEndpoint = "/products";
const categoriesEndpoint = "/categories";

const state = {
    product: null,
    categories: [],
    imagePreview: "",
};

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

function extractList(payload) {
    const parsedPayload = parseMaybeJson(payload);

    if (Array.isArray(parsedPayload)) {
        return parsedPayload;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
        return [];
    }

    if (parsedPayload.body) {
        const bodyList = extractList(parsedPayload.body);
        if (bodyList.length) return bodyList;
    }

    const possibleKeys = [
        "data",
        "items",
        "products",
        "categories",
        "result",
        "results",
    ];
    for (const key of possibleKeys) {
        const value = parsedPayload[key];
        if (Array.isArray(value)) return value;

        if (value && typeof value === "object") {
            const nestedList = extractList(value);
            if (nestedList.length) return nestedList;
        }
    }

    return [];
}

function getEditingProduct() {
    try {
        return JSON.parse(sessionStorage.getItem("editingProduct") || "null");
    } catch {
        return null;
    }
}

function previewImage(event) {
    const file = event?.target?.files?.[0];
    const output = document.getElementById("imgPreview");

    if (!file || !output) return;

    const reader = new FileReader();
    reader.onload = function () {
        state.imagePreview = reader.result;
        output.src = reader.result;
        output.style.display = "block";
    };
    reader.readAsDataURL(file);
}

window.previewImage = previewImage;

function renderPreviewImage(url) {
    const output = document.getElementById("imgPreview");
    if (!output) return;

    if (url) {
        output.src = url;
        output.style.display = "block";
    } else {
        output.src = "";
        output.style.display = "none";
    }
}

async function loadCategories() {
    try {
        const response = await api.get(categoriesEndpoint);
        const categories = extractList(response);

        state.categories = categories.map((item, index) => ({
            id: pickFirstValue(item.id, item.categoryId, index + 1),
            name: normalizeCategory(item),
        }));
    } catch (error) {
        console.error("Không thể tải danh mục:", error);
        state.categories = [];
    }
}

function renderCategoryOptions(selectedCategoryName = "") {
    const categorySelect = document.getElementById("productCategory");
    if (!categorySelect) return;

    const selectedNormalized = String(selectedCategoryName || "")
        .trim()
        .toLowerCase();

    categorySelect.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Chọn danh mục";
    categorySelect.appendChild(defaultOption);

    state.categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;

        if (category.name.trim().toLowerCase() === selectedNormalized) {
            option.selected = true;
        }

        categorySelect.appendChild(option);
    });
}

function fillEditProductForm(product) {
    if (!product) return;

    const nameInput = document.getElementById("productName");
    const descInput = document.getElementById("productDescription");
    const categoryInput = document.getElementById("productCategory");
    const statusInput = document.getElementById("productStatus");
    const priceInput = document.getElementById("productPrice");
    const costInput = document.getElementById("productCost");
    const skuInput = document.getElementById("productSku");
    const stockInput = document.getElementById("productStock");

    if (nameInput) nameInput.value = product.name || "";
    if (descInput) descInput.value = product.description || "";
    if (categoryInput) categoryInput.value = product.category || "";
    if (statusInput) statusInput.value = product.status || "Đang bán";
    if (priceInput) priceInput.value = product.price || 0;
    if (costInput) costInput.value = product.cost || 0;
    if (skuInput) skuInput.value = product.sku || "";
    if (stockInput) stockInput.value = product.stock || 0;

    renderPreviewImage(product.image || product.imageUrl || "");
}

function setupBackButton() {
    const backButton = document.getElementById("btnBackToProducts");
    if (!backButton) return;

    backButton.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = "./index.html";
    });
}

function setupCancelButton() {
    const cancelButton = document.getElementById("btnCancelEdit");
    if (!cancelButton) return;

    cancelButton.addEventListener("click", () => {
        window.location.href = "./index.html";
    });
}

function findCategoryByName(categoryName) {
    const normalizedInput = String(categoryName || "")
        .trim()
        .toLowerCase();

    return state.categories.find((item) => {
        return (
            String(item.name || "")
                .trim()
                .toLowerCase() === normalizedInput
        );
    });
}

async function updateProductApi(productId, formValues) {
    const matchedCategory = findCategoryByName(formValues.category);

    if (!matchedCategory) {
        throw new Error("Danh mục không tồn tại trong hệ thống");
    }

    const payload = {
        categoryId: Number(matchedCategory.id),
        imageId: formValues.imageId || "",
        name: formValues.name,
        sku: formValues.sku,
        price: Number(formValues.price),
        remaining: Number(formValues.stock),
    };

    await api.put(`${productsEndpoint}/${productId}`, payload);
}

function setupSubmit() {
    const form = document.getElementById("productForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!state.product?.id) {
            alert("Không tìm thấy sản phẩm để cập nhật");
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');

        const formValues = {
            name: document.getElementById("productName")?.value?.trim() || "",
            description:
                document.getElementById("productDescription")?.value?.trim() ||
                "",
            category:
                document.getElementById("productCategory")?.value?.trim() || "",
            status:
                document.getElementById("productStatus")?.value?.trim() ||
                "Đang bán",
            price: document.getElementById("productPrice")?.value || "0",
            cost: document.getElementById("productCost")?.value || "0",
            sku: document.getElementById("productSku")?.value?.trim() || "",
            stock: document.getElementById("productStock")?.value || "0",
            imageId: state.product.imageId || "",
            image:
                state.imagePreview ||
                state.product.image ||
                state.product.imageUrl ||
                "",
        };

        if (!formValues.name || !formValues.category || !formValues.sku) {
            alert("Vui lòng nhập đầy đủ tên sản phẩm, danh mục và SKU");
            return;
        }

        try {
            if (submitButton) submitButton.disabled = true;

            await updateProductApi(state.product.id, formValues);

            const updatedProduct = {
                ...state.product,
                name: formValues.name,
                description: formValues.description,
                category: formValues.category,
                status: formValues.status,
                price: Number(formValues.price),
                cost: Number(formValues.cost),
                sku: formValues.sku,
                stock: Number(formValues.stock),
                image: formValues.image,
            };

            sessionStorage.setItem(
                "editingProduct",
                JSON.stringify(updatedProduct)
            );

            alert("Cập nhật sản phẩm thành công");
            window.location.href = "./index.html";
        } catch (error) {
            console.error("Không thể cập nhật sản phẩm:", error);
            alert(error?.message || "Cập nhật sản phẩm thất bại");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

async function initEditProductPage() {
    const product = getEditingProduct();

    if (!product) {
        alert("Không tìm thấy dữ liệu sản phẩm để chỉnh sửa");
        window.location.href = "./index.html";
        return;
    }

    state.product = product;

    setupBackButton();
    setupCancelButton();
    await loadCategories();
    renderCategoryOptions(product.category || "");
    fillEditProductForm(product);
    setupSubmit();
}

if (document.readyState !== "loading") {
    initEditProductPage();
} else {
    document.addEventListener("DOMContentLoaded", initEditProductPage);
}
