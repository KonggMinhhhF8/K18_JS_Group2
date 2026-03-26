
  // Biểu đồ đường (Revenue Chart)
  const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
  new Chart(ctxRevenue, {
    type: 'line',
    data: {
      labels: ['18/01', '19/01', '20/01', '21/01', '22/01', '23/01', '24/01'],
      datasets: [{
        label: 'Doanh thu (VNĐ)',
        data: [12000000, 19000000, 15000000, 25000000, 22000000, 30000000, 28000000],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  });

  // Biểu đồ tròn (Category Chart)
  const ctxCategory = document.getElementById('categoryChart').getContext('2d');
  new Chart(ctxCategory, {
    type: 'doughnut',
    data: {
      labels: ['Điện thoại', 'Phụ kiện', 'Máy tính bảng'],
      datasets: [{
        data: [60, 25, 15],
        backgroundColor: ['#3498db', '#2ecc71', '#f1c40f']
      }]
    }
  });