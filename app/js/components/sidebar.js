export function renderSidebar(currentPage = "", basePath = "") {
    return `
    <aside class="sidebar" id="sidebar">
      <h2>ShopAdmin</h2>
      <ul>
        <li class="${currentPage === "dashboard" ? "active" : ""}">
          <i class="fas fa-home"></i>
          <a href="${basePath}index.html">Tổng quan</a>
        </li>

        <li class="${currentPage === "products" ? "active" : ""}">
          <i class="fas fa-box"></i>
          <a href="${basePath}pages/products/index.html">Sản phẩm</a>
        </li>

        <li class="${currentPage === "orders" ? "active" : ""}">
          <i class="fas fa-shopping-bag"></i>
          <a href="${basePath}pages/orders/index.html">Đơn hàng</a>
        </li>

        <li class="${currentPage === "customers" ? "active" : ""}">
          <i class="fas fa-users"></i>
          <a href="${basePath}pages/customers/index.html">Khách hàng</a>
        </li>

        <li class="${currentPage === "reports" ? "active" : ""}">
          <i class="fas fa-chart-line"></i>
          <a href="${basePath}pages/reports/index.html">Báo cáo</a>
        </li>
      </ul>
    </aside>
  `;
}
