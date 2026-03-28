export function renderTable(config) {
    const { containerId, title = '', columns = [], rows = [], tableId } = config || {};
    
    // Tìm phần tử chứa bảng
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('[TableComponent] Container not found:', containerId);
        return;
    }
    
    // Xóa nội dung cũ trong container
    container.innerHTML = '';

    // Tạo phần bọc ngoài bảng
    const section = document.createElement('section');
    section.className = 'table-container';

    // Tạo Header nếu có title
    if (title) {
        const header = document.createElement('div');
        header.className = 'table-header';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        header.appendChild(h3);
        section.appendChild(header);
    }

    // Khởi tạo thẻ table
    const table = document.createElement('table');
    if (tableId) { 
        table.id = tableId; 
    }

    // Xây dựng thead
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    
    columns.forEach(col => {
        if (!col || !col.key) {
            console.warn('[TableComponent] Invalid column configuration, missing key:', col);
            return;
        }

        const th = document.createElement('th');
        th.textContent = col.label || col.key;
        trHead.appendChild(th);
    });
    
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Xây dựng tbody
    const tbody = document.createElement('tbody');
    
    rows.forEach(row => {
        const tr = document.createElement('tr');
        
        columns.forEach(col => {
            const td = document.createElement('td');
            
            // Xử lý custom render nếu có truyền hàm render
            if (typeof col.render === 'function') {
                const result = col.render(row[col.key], row);
                
                if (result instanceof Node) {
                    td.appendChild(result);
                } else if (typeof result === 'string' || typeof result === 'number') {
                    td.textContent = result;
                } else {
                    td.textContent = '';
                }
            } else {
                // Xử lý hiển thị text thông thường
                const value = row[col.key];
                td.textContent = value === undefined || value === null ? '' : value;
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    
    // Lắp ráp toàn bộ khối HTML
    section.appendChild(table);
    container.appendChild(section);
}