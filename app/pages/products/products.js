import { openModal, closeModal } from '../../js/components/modal.js';
import { renderTable } from '../../js/components/table.js';
import { api } from '../../js/api.js';

const modalId = 'productModal';
const productsEndpoint = '/products';
const lowStockThreshold = 5;
const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45' viewBox='0 0 45 45'%3E%3Crect width='45' height='45' rx='8' fill='%23e9eef5'/%3E%3Cpath d='M14 29l5.4-5.4a1.5 1.5 0 0 1 2.1 0l2.7 2.7 6.6-6.6a1.5 1.5 0 0 1 2.1 0L36 23v6.5A2.5 2.5 0 0 1 33.5 32h-21A2.5 2.5 0 0 1 10 29.5V18a2.5 2.5 0 0 1 2.5-2.5h21A2.5 2.5 0 0 1 36 18v1' fill='none' stroke='%2391a0b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='17' cy='18.5' r='2.5' fill='%2391a0b8'/%3E%3C/svg%3E";

const state = {
    allProducts: [],
    searchTerm: '',
    selectedCategory: 'all',
    loadError: ''
};

const columns = [
    {
        key: 'image',
        label: 'Hình',
        render: (_, row) => createProductImage(row.image, row.name)
    },
    {
        key: 'name',
        label: 'Thông tin sản phẩm',
        render: (_, row) => createProductInfo(row)
    },
    { key: 'category', label: 'Danh mục' },
    {
        key: 'price',
        label: 'Giá bán',
        render: value => formatMoney(value)
    },
    {
        key: 'stock',
        label: 'Tồn kho',
        render: value => createStockNode(value)
    },
    {
        key: 'actions',
        label: 'Thao tác',
        render: (_, row) => createActionButtons(row)
    }
];

function formatMoney(value) {
    const amount = Number.isFinite(value) ? value : toNumber(value);

    if (!Number.isFinite(amount)) {
        return '0 VND';
    }

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function toNumber(value) {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value !== 'string') {
        return Number(value) || 0;
    }

    const digitsOnly = value.replace(/[^\d-]/g, '');
    return Number(digitsOnly) || 0;
}

function pickFirstValue(...values) {
    return values.find(value => {
        if (value === undefined || value === null) {
            return false;
        }

        if (typeof value === 'string') {
            return value.trim() !== '';
        }

        return true;
    });
}

function parseMaybeJson(value) {
    if (typeof value !== 'string') {
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

    if (!parsedPayload || typeof parsedPayload !== 'object') {
        return [];
    }

    if (parsedPayload.body) {
        const bodyList = extractProductList(parsedPayload.body);
        if (bodyList.length) {
            return bodyList;
        }
    }

    const possibleKeys = ['data', 'items', 'products', 'result', 'results'];
    for (const key of possibleKeys) {
        const value = parsedPayload[key];
        if (Array.isArray(value)) {
            return value;
        }

        if (value && typeof value === 'object') {
            const nestedList = extractProductList(value);
            if (nestedList.length) {
                return nestedList;
            }
        }
    }

    return [];
}

function normalizeCategory(category) {
    if (typeof category === 'string') {
        return category.trim() || 'Chưa phân loại';
    }

    if (category && typeof category === 'object') {
        return pickFirstValue(
            category.name,
            category.title,
            category.label,
            category.categoryName
        ) || 'Chưa phân loại';
    }

    return 'Chưa phân loại';
}

function normalizeImage(image) {
    if (typeof image === 'string') {
        return image;
    }

    if (Array.isArray(image)) {
        return normalizeImage(image[0]);
    }

    if (image && typeof image === 'object') {
        return pickFirstValue(
            image.url,
            image.src,
            image.imageUrl,
            image.thumbnail
        ) || '';
    }

    return '';
}

function normalizeProduct(product, index) {
    const id = pickFirstValue(product.id, product._id, product.productId, `product-${index + 1}`);
    const name = pickFirstValue(product.name, product.productName, product.title, 'Chưa có tên sản phẩm');
    const sku = pickFirstValue(product.sku, product.code, product.productCode, product.productSku, 'N/A');
    const category = normalizeCategory(
        pickFirstValue(product.category, product.categoryName, product.productCategory)
    );
    const price = toNumber(
        pickFirstValue(product.price, product.salePrice, product.sellingPrice, product.unitPrice)
    );
    const stock = toNumber(
        pickFirstValue(product.stock, product.quantity, product.inventory, product.stockQuantity)
    );
    const image = normalizeImage(
        pickFirstValue(product.image, product.imageUrl, product.thumbnail, product.images)
    );

    return {
        id,
        name,
        sku,
        category,
        price,
        stock,
        image
    };
}

function createProductImage(image, name) {
    const img = document.createElement('img');
    img.src = image || placeholderImage;
    img.alt = name;
    img.className = 'img-thumb product-thumbnail';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
        img.src = placeholderImage;
    });
    return img;
}

function createProductInfo(product) {
    const wrapper = document.createElement('div');
    wrapper.className = 'product-info';

    const name = document.createElement('strong');
    name.className = 'product-name';
    name.textContent = product.name;

    const sku = document.createElement('span');
    sku.className = 'product-sku';
    sku.textContent = `SKU: ${product.sku}`;

    wrapper.appendChild(name);
    wrapper.appendChild(sku);

    return wrapper;
}

function createStockNode(stock) {
    const stockValue = Number.isFinite(stock) ? stock : toNumber(stock);
    const span = document.createElement('span');
    span.textContent = stockValue <= lowStockThreshold ? `${stockValue} (Cảnh báo)` : `${stockValue}`;

    if (stockValue <= lowStockThreshold) {
        span.className = 'stock-low';
    }

    return span;
}

function createActionButtons(product) {
    const wrapper = document.createElement('div');
    wrapper.className = 'product-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn-icon edit';
    editButton.title = 'Chỉnh sửa';
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.addEventListener('click', () => {
        console.log('Chỉnh sửa sản phẩm:', product.id);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn-icon delete';
    deleteButton.title = 'Xóa';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.addEventListener('click', () => {
        console.log('Xóa sản phẩm:', product.id);
    });

    wrapper.appendChild(editButton);
    wrapper.appendChild(deleteButton);

    return wrapper;
}

function getCategories(products) {
    return [...new Set(products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
}

function getFilteredProducts() {
    const normalizedSearch = state.searchTerm.trim().toLowerCase();

    return state.allProducts.filter(product => {
        const matchKeyword = !normalizedSearch || [product.name, product.sku, product.category]
            .some(value => String(value).toLowerCase().includes(normalizedSearch));
        const matchCategory = state.selectedCategory === 'all' || product.category === state.selectedCategory;
        return matchKeyword && matchCategory;
    });
}

function createCategoryFilter() {
    const categories = getCategories(state.allProducts);

    if (state.selectedCategory !== 'all' && !categories.includes(state.selectedCategory)) {
        state.selectedCategory = 'all';
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'table-filters';

    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Lọc theo danh mục');

    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'Tất cả danh mục';
    select.appendChild(defaultOption);

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    select.value = state.selectedCategory;
    select.addEventListener('change', event => {
        state.selectedCategory = event.target.value;
        renderProductsTable();
    });

    wrapper.appendChild(select);

    return wrapper;
}

function updateSummaryCards(products) {
    const totalProductsValue = document.getElementById('totalProductsValue');
    const lowStockValue = document.getElementById('lowStockValue');
    const totalCategoriesValue = document.getElementById('totalCategoriesValue');

    if (totalProductsValue) {
        totalProductsValue.textContent = `${products.length}`;
    }

    if (lowStockValue) {
        lowStockValue.textContent = `${products.filter(product => product.stock <= lowStockThreshold).length}`;
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
        return 'Không tìm thấy sản phẩm phù hợp';
    }

    return 'Không có sản phẩm';
}

function renderProductsTable() {
    renderTable({
        containerId: 'products-table-root',
        title: 'Danh mục sản phẩm',
        columns,
        rows: getFilteredProducts(),
        tableId: 'products-table',
        headerActions: createCategoryFilter(),
        emptyMessage: getEmptyMessage()
    });
}

async function loadProducts() {
    state.loadError = '';

    renderTable({
        containerId: 'products-table-root',
        title: 'Danh mục sản phẩm',
        columns,
        rows: [],
        tableId: 'products-table',
        headerActions: createCategoryFilter(),
        emptyMessage: 'Đang tải dữ liệu sản phẩm...'
    });

    try {
        const response = await api.get(productsEndpoint);
        state.allProducts = extractProductList(response).map(normalizeProduct);
        updateSummaryCards(state.allProducts);
        renderProductsTable();
    } catch (error) {
        console.error('Không thể tải danh sách sản phẩm:', error);
        state.allProducts = [];
        state.loadError = 'Không tải được dữ liệu sản phẩm từ API';
        updateSummaryCards([]);
        renderProductsTable();
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener('input', event => {
        state.searchTerm = event.target.value;
        renderProductsTable();
    });
}

function setupProductModal() {
    const addButton = document.getElementById('btnAddProduct');
    const closeButton = document.getElementById('btnCloseProduct');
    const modalForm = document.querySelector('#productModal #productForm');

    if (addButton) {
        addButton.addEventListener('click', () => openModal(modalId));
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => closeModal(modalId));
    }

    if (modalForm) {
        modalForm.addEventListener('submit', event => {
            event.preventDefault();
            console.log('Đã lưu sản phẩm!');
            closeModal(modalId);
        });
    }
}

function previewImage(event) {
    const file = event?.target?.files?.[0];
    const output = document.getElementById('imgPreview');

    if (!file || !output) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function () {
        output.src = reader.result;
        output.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

window.previewImage = previewImage;

async function initProductsPage() {
    if (!document.getElementById('products-table-root')) {
        return;
    }

    setupSearch();
    setupProductModal();
    await loadProducts();
}

if (document.readyState !== 'loading') {
    initProductsPage();
} else {
    document.addEventListener('DOMContentLoaded', initProductsPage);
}
