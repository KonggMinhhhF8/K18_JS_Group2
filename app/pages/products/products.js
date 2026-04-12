import { openModal, closeModal } from "../../js/components/modal.js";
import { renderTable } from "../../js/components/table.js";
import { api } from "../../js/api.js";
import { renderSidebar } from "../../js/components/sidebar.js";

const container = document.querySelector(".container");
container.insertAdjacentHTML("afterbegin", renderSidebar("products", "../../"));

const modalId = "productModal";
const productsEndpoint = "/products";
const categoriesEndpoint = "/categories";
const lowStockThreshold = 5;

const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45' viewBox='0 0 45 45'%3E%3Crect width='45' height='45' rx='8' fill='%23e9eef5'/%3E%3Cpath d='M14 29l5.4-5.4a1.5 1.5 0 0 1 2.1 0l2.7 2.7 6.6-6.6a1.5 1.5 0 0 1 2.1 0L36 23v6.5A2.5 2.5 0 0 1 33.5 32h-21A2.5 2.5 0 0 1 10 29.5V18a2.5 2.5 0 0 1 2.5-2.5h21A2.5 2.5 0 0 1 36 18v1' fill='none' stroke='%2391a0b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='17' cy='18.5' r='2.5' fill='%2391a0b8'/%3E%3C/svg%3E";

const state = {
    allProducts: [],
    allCategories: [],
    searchTerm: "",
    selectedCategory: "all",
    loadError: "",
    editingProductId: null,
};

const columns = [
    {
        key: "image",
        label: "Hình",
        render: (_, row) => createProductImage(row.image, row.name),
    },
    {
        key: "name",
        label: "Thông tin sản phẩm",
        render: (_, row) => createProductInfo(row),
    },
    { key: "category", label: "Danh mục" },
    {
        key: "price",
        label: "Giá bán",
        render: (value) => formatMoney(value),
    },
    {
        key: "stock",
        label: "Tồn kho",
        render: (value) => createStockNode(value),
    },
    {
        key: "actions",
        label: "Thao tác",
        render: (_, row) => createActionButtons(row),
    },
];

function formatMoney(value) {
    const amount = Number.isFinite(value) ? value : toNumber(value);

    if (!Number.isFinite(amount)) {
        return "0 VND";
    }

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

function toNumber(value) {
    if (typeof value === "number") return value;

    if (typeof value !== "string") {
        return Number(value) || 0;
    }

    const digitsOnly = value.replace(/[^\d-]/g, "");
    return Number(digitsOnly) || 0;
}

function pickFirstValue(...values) {
    return values.find((value) => {
        if (value === undefined || value === null) return false;
        if (typeof value === "string") return value.trim() !== "";
        return true;
    });
}

function parseMaybeJson(value) {
    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function extractProductList(payload) {
    const parsedPayload = parseMaybeJson(payload);

    if (Array.isArray(parsedPayload)) {
        return parsedPayload;
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
        return [];
    }

    if (parsedPayload.body) {
        const bodyList = extractProductList(parsedPayload.body);
        if (bodyList.length) {
            return bodyList;
        }
    }

    const possibleKeys = ["data", "items", "products", "result", "results"];
    for (const key of possibleKeys) {
        const value = parsedPayload[key];

        if (Array.isArray(value)) {
            return value;
        }

        if (value && typeof value === "object") {
            const nestedList = extractProductList(value);
            if (nestedList.length) {
                return nestedList;
            }
        }
    }

    return [];
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

function normalizeImage(image) {
    if (typeof image === "string") {
        return image;
    }

    if (Array.isArray(image)) {
        return normalizeImage(image[0]);
    }

    if (image && typeof image === "object") {
        return (
            pickFirstValue(
                image.url,
                image.src,
                image.imageUrl,
                image.thumbnail
            ) || ""
        );
    }

    return "";
}

function normalizeProduct(product, index) {
    const id = pickFirstValue(
        product.id,
        product._id,
        product.productId,
        `product-${index + 1}`
    );

    const name = pickFirstValue(
        product.name,
        product.productName,
        product.title,
        "Chưa có tên sản phẩm"
    );

    const sku = pickFirstValue(
        product.sku,
        product.code,
        product.productCode,
        product.productSku,
        "N/A"
    );

    const category = normalizeCategory(
        pickFirstValue(
            product.category,
            product.categoryName,
            product.productCategory
        )
    );

    const price = toNumber(
        pickFirstValue(
            product.price,
            product.salePrice,
            product.sellingPrice,
            product.unitPrice
        )
    );

    const stock = toNumber(
        pickFirstValue(
            product.remaining,
            product.stock,
            product.quantity,
            product.inventory,
            product.stockQuantity
        )
    );

    const image = normalizeImage(
        pickFirstValue(
            product.imageUrl,
            product.image,
            product.thumbnail,
            product.images
        )
    );

    return {
        id,
        name,
        sku,
        category,
        price,
        stock,
        image,
    };
}

function normalizeCategoryItem(category, index) {
    return {
        id: pickFirstValue(category.id, category.categoryId, index + 1),
        name: normalizeCategory(category),
    };
}

function generateSkuFromName(name = "") {
    const normalized = String(name)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 20);

    const randomPart = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");

    return normalized ? `${normalized}-${randomPart}` : `SKU-${Date.now()}`;
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

    state.allCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;

        if (category.name.trim().toLowerCase() === selectedNormalized) {
            option.selected = true;
        }

        categorySelect.appendChild(option);
    });
}

function resetProductForm() {
    const modalForm = document.querySelector("#productModal #productForm");
    if (modalForm) {
        modalForm.reset();
    }

    state.editingProductId = null;
    renderCategoryOptions();
    updateModalMode();
}

function updateModalMode() {
    const title = document.getElementById("productModalTitle");
    const submitButton = document.getElementById("productSubmitButton");

    const isEditing = Boolean(state.editingProductId);

    if (title) {
        title.textContent = isEditing
            ? "Chỉnh sửa sản phẩm"
            : "Thêm sản phẩm mới";
    }

    if (submitButton) {
        submitButton.textContent = isEditing ? "Lưu thay đổi" : "Lưu sản phẩm";
    }
}

function fillProductForm(product) {
    const nameInput = document.getElementById("productName");
    const categoryInput = document.getElementById("productCategory");
    const priceInput = document.getElementById("productPrice");
    const stockInput = document.getElementById("productStock");

    if (nameInput) nameInput.value = product.name || "";
    if (priceInput) priceInput.value = product.price || 0;
    if (stockInput) stockInput.value = product.stock || 0;

    renderCategoryOptions(product.category || "");

    if (categoryInput) {
        categoryInput.value = product.category || "";
    }
}

function openCreateModal() {
    resetProductForm();
    openModal(modalId);
}

function openEditModal(product) {
    if (!product) return;

    resetProductForm();
    state.editingProductId = product.id;
    fillProductForm(product);
    updateModalMode();
    openModal(modalId);
}

function findCategoryByName(categoryName) {
    const normalizedInput = String(categoryName || "")
        .trim()
        .toLowerCase();

    return state.allCategories.find((item) => {
        return (
            String(item.name || "")
                .trim()
                .toLowerCase() === normalizedInput
        );
    });
}

async function loadCategories() {
    try {
        const response = await api.get(categoriesEndpoint);
        const categories = extractProductList(response);
        state.allCategories = categories.map(normalizeCategoryItem);
        renderCategoryOptions();
    } catch (error) {
        console.error("Không thể tải danh mục:", error);
        state.allCategories = [];
        renderCategoryOptions();
    }
}

async function createProductApi(productData) {
    const matchedCategory = findCategoryByName(productData.category);

    if (!matchedCategory) {
        throw new Error("Danh mục không tồn tại trong hệ thống");
    }

    const payload = {
        categoryId: Number(matchedCategory.id),
        imageId: productData.imageId || "",
        name: productData.name,
        sku: productData.sku,
        price: Number(productData.price),
        remaining: Number(productData.stock),
    };

    return api.post(productsEndpoint, payload);
}

async function updateProductApi(productId, productData) {
    const matchedCategory = findCategoryByName(productData.category);

    if (!matchedCategory) {
        throw new Error("Danh mục không tồn tại trong hệ thống");
    }

    const payload = {
        categoryId: Number(matchedCategory.id),
        imageId: productData.imageId || "",
        name: productData.name,
        sku: productData.sku,
        price: Number(productData.price),
        remaining: Number(productData.stock),
    };

    return api.put(`${productsEndpoint}/${productId}`, payload);
}

function buildCreatedProduct(formValues, apiResponse) {
    const parsedResponse = parseMaybeJson(apiResponse);

    if (
        parsedResponse &&
        typeof parsedResponse === "object" &&
        !Array.isArray(parsedResponse)
    ) {
        return normalizeProduct(
            {
                ...parsedResponse,
                category: {
                    ...(parsedResponse.category || {}),
                    name: formValues.category,
                },
                categoryName: formValues.category,
            },
            0
        );
    }

    return normalizeProduct(
        {
            id: `product-${Date.now()}`,
            name: formValues.name,
            sku: formValues.sku,
            price: Number(formValues.price),
            remaining: Number(formValues.stock),
            imageUrl: "",
            category: {
                id: formValues.categoryId || "",
                name: formValues.category,
            },
            categoryName: formValues.category,
        },
        0
    );
}

function buildUpdatedProduct(currentProduct, formValues, apiResponse) {
    const parsedResponse = parseMaybeJson(apiResponse);

    if (
        parsedResponse &&
        typeof parsedResponse === "object" &&
        !Array.isArray(parsedResponse)
    ) {
        return normalizeProduct(
            {
                ...currentProduct,
                ...parsedResponse,
                category: {
                    ...(parsedResponse.category || {}),
                    name: formValues.category,
                },
                categoryName: formValues.category,
            },
            0
        );
    }

    return {
        ...currentProduct,
        name: formValues.name,
        category: formValues.category,
        price: Number(formValues.price),
        stock: Number(formValues.stock),
        sku: formValues.sku,
    };
}

function createProductImage(image, name) {
    const img = document.createElement("img");
    img.src = image || placeholderImage;
    img.alt = name;
    img.className = "img-thumb product-thumbnail";
    img.loading = "lazy";

    img.addEventListener("error", () => {
        img.src = placeholderImage;
    });

    return img;
}

function createProductInfo(product) {
    const wrapper = document.createElement("div");
    wrapper.className = "product-info";

    const name = document.createElement("strong");
    name.className = "product-name";
    name.textContent = product.name;

    const sku = document.createElement("span");
    sku.className = "product-sku";
    sku.textContent = `SKU: ${product.sku}`;

    wrapper.appendChild(name);
    wrapper.appendChild(sku);

    return wrapper;
}

function createStockNode(stock) {
    const stockValue = Number.isFinite(stock) ? stock : toNumber(stock);
    const span = document.createElement("span");
    span.textContent =
        stockValue <= lowStockThreshold
            ? `${stockValue} (Cảnh báo)`
            : `${stockValue}`;

    if (stockValue <= lowStockThreshold) {
        span.className = "stock-low";
    }

    return span;
}

async function deleteProduct(productId) {
    if (!productId) {
        throw new Error("Không tìm thấy id sản phẩm");
    }

    await api.delete(`${productsEndpoint}/${productId}`);
}

async function handleDeleteProduct(product) {
    const isConfirmed = window.confirm(
        `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`
    );

    if (!isConfirmed) {
        return;
    }

    try {
        await deleteProduct(product.id);

        state.allProducts = state.allProducts.filter(
            (item) => String(item.id) !== String(product.id)
        );

        updateSummaryCards(state.allProducts);
        renderProductsTable();

        alert("Xóa sản phẩm thành công");
    } catch (error) {
        console.error("Không thể xóa sản phẩm:", error);
        alert(error?.message || "Xóa sản phẩm thất bại");
    }
}

function createActionButtons(product) {
    const wrapper = document.createElement("div");
    wrapper.className = "product-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn-icon edit";
    editButton.title = "Chỉnh sửa";
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.addEventListener("click", () => {
        openEditModal(product);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn-icon delete";
    deleteButton.title = "Xóa";
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

    deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;

        try {
            await handleDeleteProduct(product);
        } finally {
            deleteButton.disabled = false;
        }
    });

    wrapper.appendChild(editButton);
    wrapper.appendChild(deleteButton);

    return wrapper;
}

function getCategories(products) {
    return [
        ...new Set(products.map((product) => product.category).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "vi"));
}

function getFilteredProducts() {
    const normalizedSearch = state.searchTerm.trim().toLowerCase();

    return state.allProducts.filter((product) => {
        const matchKeyword =
            !normalizedSearch ||
            [product.name, product.sku, product.category].some((value) =>
                String(value).toLowerCase().includes(normalizedSearch)
            );

        const matchCategory =
            state.selectedCategory === "all" ||
            product.category === state.selectedCategory;

        return matchKeyword && matchCategory;
    });
}

function createCategoryFilter() {
    const categories = getCategories(state.allProducts);

    if (
        state.selectedCategory !== "all" &&
        !categories.includes(state.selectedCategory)
    ) {
        state.selectedCategory = "all";
    }

    const wrapper = document.createElement("div");
    wrapper.className = "table-filters";

    const select = document.createElement("select");
    select.setAttribute("aria-label", "Lọc theo danh mục");

    const defaultOption = document.createElement("option");
    defaultOption.value = "all";
    defaultOption.textContent = "Tất cả danh mục";
    select.appendChild(defaultOption);

    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    select.value = state.selectedCategory;
    select.addEventListener("change", (event) => {
        state.selectedCategory = event.target.value;
        renderProductsTable();
    });

    wrapper.appendChild(select);

    return wrapper;
}

function updateSummaryCards(products) {
    const totalProductsValue = document.getElementById("totalProductsValue");
    const lowStockValue = document.getElementById("lowStockValue");
    const totalCategoriesValue = document.getElementById(
        "totalCategoriesValue"
    );

    if (totalProductsValue) {
        totalProductsValue.textContent = `${products.length}`;
    }

    if (lowStockValue) {
        lowStockValue.textContent = `${
            products.filter((product) => product.stock <= lowStockThreshold)
                .length
        }`;
    }

    if (totalCategoriesValue) {
        totalCategoriesValue.textContent = `${getCategories(products).length}`;
    }
}

function getEmptyMessage() {
    if (state.loadError) {
        return state.loadError;
    }

    if (state.allProducts.length && !getFilteredProducts().length) {
        return "Không tìm thấy sản phẩm phù hợp";
    }

    return "Không có sản phẩm";
}

function renderProductsTable() {
    renderTable({
        containerId: "products-table-root",
        title: "Danh mục sản phẩm",
        columns,
        rows: getFilteredProducts(),
        tableId: "products-table",
        headerActions: createCategoryFilter(),
        emptyMessage: getEmptyMessage(),
    });
}

async function loadProducts() {
    state.loadError = "";

    renderTable({
        containerId: "products-table-root",
        title: "Danh mục sản phẩm",
        columns,
        rows: [],
        tableId: "products-table",
        headerActions: createCategoryFilter(),
        emptyMessage: "Đang tải dữ liệu sản phẩm...",
    });

    try {
        const response = await api.get(productsEndpoint);
        state.allProducts = extractProductList(response).map(normalizeProduct);
        updateSummaryCards(state.allProducts);
        renderProductsTable();
    } catch (error) {
        console.error("Không thể tải danh sách sản phẩm:", error);
        state.allProducts = [];
        state.loadError = "Không tải được dữ liệu sản phẩm từ API";
        updateSummaryCards([]);
        renderProductsTable();
    }
}

function setupSearch() {
    const searchInput = document.getElementById("searchInput");

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener("input", (event) => {
        state.searchTerm = event.target.value;
        renderProductsTable();
    });
}

function setupProductModal() {
    const addButton = document.getElementById("btnAddProduct");
    const closeButton = document.getElementById("btnCloseProduct");
    const modalForm = document.querySelector("#productModal #productForm");

    if (addButton) {
        addButton.addEventListener("click", () => {
            openCreateModal();
        });
    }

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            resetProductForm();
            closeModal(modalId);
        });
    }

    if (modalForm) {
        modalForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const submitButton = modalForm.querySelector(
                'button[type="submit"]'
            );
            const nameInput = document.getElementById("productName");
            const categoryInput = document.getElementById("productCategory");
            const priceInput = document.getElementById("productPrice");
            const stockInput = document.getElementById("productStock");

            const formValues = {
                name: nameInput?.value?.trim() || "",
                category: categoryInput?.value || "",
                price: priceInput?.value || "0",
                stock: stockInput?.value || "0",
                imageId: "",
                sku: "",
                categoryId: "",
            };

            if (!formValues.name || !formValues.category) {
                alert("Vui lòng nhập tên sản phẩm và chọn danh mục");
                return;
            }

            const matchedCategory = findCategoryByName(formValues.category);
            if (!matchedCategory) {
                alert("Danh mục không tồn tại trong hệ thống");
                return;
            }

            formValues.categoryId = matchedCategory.id;

            const isEditing = Boolean(state.editingProductId);
            const currentProduct = state.allProducts.find(
                (item) => String(item.id) === String(state.editingProductId)
            );

            formValues.sku = isEditing
                ? currentProduct?.sku || generateSkuFromName(formValues.name)
                : generateSkuFromName(formValues.name);

            try {
                if (submitButton) {
                    submitButton.disabled = true;
                }

                if (isEditing && currentProduct) {
                    const apiResponse = await updateProductApi(
                        state.editingProductId,
                        formValues
                    );
                    const updatedProduct = buildUpdatedProduct(
                        currentProduct,
                        formValues,
                        apiResponse
                    );

                    state.allProducts = state.allProducts.map((item) =>
                        String(item.id) === String(state.editingProductId)
                            ? updatedProduct
                            : item
                    );

                    alert("Cập nhật sản phẩm thành công");
                } else {
                    const apiResponse = await createProductApi(formValues);
                    const createdProduct = buildCreatedProduct(
                        formValues,
                        apiResponse
                    );

                    state.allProducts = [createdProduct, ...state.allProducts];

                    alert("Thêm sản phẩm thành công");
                }

                updateSummaryCards(state.allProducts);
                renderProductsTable();
                resetProductForm();
                closeModal(modalId);
            } catch (error) {
                console.error("Không thể lưu sản phẩm:", error);
                alert(error?.message || "Lưu sản phẩm thất bại");
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }
}

async function initProductsPage() {
    if (!document.getElementById("products-table-root")) {
        return;
    }

    setupSearch();
    setupProductModal();
    await loadCategories();
    await loadProducts();
}

if (document.readyState !== "loading") {
    initProductsPage();
} else {
    document.addEventListener("DOMContentLoaded", initProductsPage);
}
