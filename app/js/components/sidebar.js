export function renderSidebar(currentPage = "", basePath = "") {
    return `
    <aside class="sidebar" id="sidebar">
      <h2>ShopAdmin</h2>
      <ul>
        <li class="${currentPage === "dashboard" ? "active" : ""}">
          <a href="${basePath}index.html">
            <i class="fas fa-home"></i>
            <span>Tổng quan</span>
          </a>
        </li>

        <li class="${currentPage === "products" ? "active" : ""}">
          <a href="${basePath}pages/products/index.html">
            <i class="fas fa-box"></i>
            <span>Sản phẩm</span>
          </a>
        </li>

        <li class="${currentPage === "orders" ? "active" : ""}">
          <a href="${basePath}pages/orders/index.html">
            <i class="fas fa-shopping-bag"></i>
            <span>Đơn hàng</span>
          </a>
        </li>

        <li class="${currentPage === "customers" ? "active" : ""}">
          <a href="${basePath}pages/customers/index.html">
            <i class="fas fa-users"></i>
            <span>Khách hàng</span>
          </a>
        </li>

        <li class="${currentPage === "reports" ? "active" : ""}">
          <a href="${basePath}pages/reports/index.html">
            <i class="fas fa-chart-line"></i>
            <span>Báo cáo</span>
          </a>
        </li>
      </ul>
    </aside>
  `;
}
