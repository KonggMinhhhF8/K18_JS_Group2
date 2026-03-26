(function(global) {
  function createSharedTable(config){
    const { containerId, title = '', columns = [], rows = [], tableId } = config || {};
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[TableComponent] container not found:', containerId);
      return;
    }
    container.innerHTML = '';

    const section = document.createElement('section');
    section.className = 'table-container';

    const header = document.createElement('div');
    header.className = 'table-header';
    header.innerHTML = '<h3>' + title + '</h3>';
    section.appendChild(header);

    const table = document.createElement('table');
    if (tableId) { table.id = tableId; }

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label || col.key || '';
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      columns.forEach(col => {
        const td = document.createElement('td');
        if (typeof col.render === 'function') {
          const result = col.render(row[col.key], row);
          if (result instanceof Node) {
            td.appendChild(result);
          } else if (typeof result === 'string' || typeof result === 'number') {
            td.innerHTML = result;
          } else {
            td.textContent = '';
          }
        } else {
          const value = row[col.key];
          td.textContent = value === undefined || value === null ? '' : value;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  }

  function formatCurrency(value){
    if (typeof value === 'number') {
      return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    }
    return String(value || '');
  }

  global.createSharedTable = createSharedTable;
  global.formatCurrency = formatCurrency;

})(window);
