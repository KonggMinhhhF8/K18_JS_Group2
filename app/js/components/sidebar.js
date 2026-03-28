export function renderSidebar(currentPage = "") {
    return `
    <aside class="sidebar" id="sidebar">
      <h2>ShopAdmin</h2>
      <ul>
        <li class="${currentPage === "dashboard" ? "active" : ""}">
          <i class="fas fa-home"></i>
          <a href="/app/index.html">Tổng quan</a>
        </li>

        <li class="${currentPage === "products" ? "active" : ""}">
          <i class="fas fa-box"></i>
          <a href="/app/pages/products/index.html">Sản phẩm</a>
        </li>

        <li class="${currentPage === "orders" ? "active" : ""}">
          <i class="fas fa-shopping-bag"></i>
          <a href="/app/pages/orders/index.html">Đơn hàng</a>
        </li>

        <li class="${currentPage === "customers" ? "active" : ""}">
          <i class="fas fa-users"></i>
          <a href="/app/pages/customers/index.html">Khách hàng</a>
        </li>

        <li class="${currentPage === "reports" ? "active" : ""}">
          <i class="fas fa-chart-line"></i>
          <a href="/app/pages/reports/index.html">Báo cáo</a>
        </li>
      </ul>
    </aside>
  `;
}
