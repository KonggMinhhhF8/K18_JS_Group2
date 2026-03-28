
export function renderSummary(config) {
		const {
				containerId, // ID của element chứa
				items = []
		} = config || {};
		
		const container = document.getElementById(containerId);
		if (!container) {
				console.warn('[SummaryComponent] Không tìm thấy container:', containerId);
				return;
		}
		
		// clear nội ducng cũ
		container.innerHTML = '';
		
		// tạo wrapper chính
		const statsSection = document.createElement('section');
		statsSection.className = 'stats';
		
		// render từng thẻ card
		items.forEach(item => {
				const { label = '', value = '' } = item;
				
				const card = document.createElement('div');
				card.className = 'card';
				
				const h3 = document.createElement('h3');
				h3.textContent = label;
				
				const p = document.createElement('p');
				p.textContent = value;
				
				card.appendChild(h3);
				card.appendChild(p);
				
				statsSection.appendChild(card);
		});
		
		// dẩy vào DOM
		container.appendChild(statsSection);
}