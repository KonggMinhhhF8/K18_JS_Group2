import { openModal, closeModal } from '../../js/components/modal.js';

const modalId = 'customerModal';

document.getElementById('btnAddCustomer').addEventListener('click', () => {
    openModal(modalId);
});

document.getElementById('btnCloseCustomer').addEventListener('click', () => {
    closeModal(modalId);
});

// Handling when the Save button is clicked (Submit form)
document.getElementById('customerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    console.log("Đã lưu khách hàng!");
    // Lát ai làm trang này thì gọi api.post() ở đây nhé
    closeModal(modalId);
});