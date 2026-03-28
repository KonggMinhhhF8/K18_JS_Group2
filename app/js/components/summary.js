

export function renderSummary(config) {
		// lấy dữ liệu từ config
		const { containerId, items = [] } = config || {};
		
		// tìm container
		const container = document.getElementById(containerId);
		if (!container) {
				console.warn('[SummaryComponent] Container not found:', containerId);
				return;
		}
		
		//clear dữ liệu cũ
		container.innerHTML = '';
		
		// tạo grid (wrapper)
		const grid = document.createElement('div');
		grid.className = 'stats-grid';
		
		// loop render từng cardl
		items.forEach(item => {
				const {
						label = '',          // tiêu đề
						value = '',          // giá trị
						trend,               // % (không set default để dễ check)
						trendType = 'up',    // up | down
						trendText = ''       // text thêm
				} = item;
				
				// tạo card
				const card = document.createElement('div');
				card.className = 'stat-card';
				
				// Title
				const titleEl = document.createElement('h4');
				titleEl.textContent = label;
				
				//Value
				const valueEl = document.createElement('div');
				valueEl.className = 'value';
				valueEl.textContent = value;
				
				card.appendChild(titleEl);
				card.appendChild(valueEl);
				
				// trend (Chỉ render nếu có data trend hoặc trendText)
				if (trend !== undefined || trendText) {
						const trendEl = document.createElement('div');
						trendEl.className = `trend ${trendType}`;
						
						// icon
						const icon = document.createElement('i');
						icon.className = trendType === 'down' ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
						
						// text
						const trendNumberStr = trend !== undefined ? `${Math.abs(trend)}% ` : '';
						const text = document.createTextNode(` ${trendNumberStr}${trendText}`);
						
						trendEl.appendChild(icon);
						trendEl.appendChild(text);
						
						card.appendChild(trendEl);
				}
				
				// thêm vào grid
				grid.appendChild(card);
		});
		
		// Render ra DOM
		container.appendChild(grid);
}