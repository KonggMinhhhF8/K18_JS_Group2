import { openModal, closeModal } from '../../js/components/modal.js';

const modalId = 'productModal';

document.getElementById('btnAddProduct').addEventListener('click', () => {
    openModal(modalId);
});

document.getElementById('btnCloseProduct').addEventListener('click', () => {
    closeModal(modalId);
});

// Handling when the Save button is clicked (Submit form)
document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    console.log("Đã lưu sản phẩm!");
    // Lát ai làm trang này thì gọi api.post() ở đây nhé
    closeModal(modalId);
});

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
      const output = document.getElementById('imgPreview');
      output.src = reader.result;
      output.style.display = 'block';
    }
    reader.readAsDataURL(event.target.files[0]);
}
