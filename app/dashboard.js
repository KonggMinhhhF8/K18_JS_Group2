import { renderSidebar } from "./js/components/sidebar.js"
const container=document.querySelector(".container");
const userTrigger = document.getElementById("userTrigger");
const logoutBtn = document.getElementById("logoutBtn");
container.insertAdjacentHTML("afterbegin", renderSidebar("dashboard"));

if (userTrigger && logoutBtn) {
    userTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        logoutBtn.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        const isClickInsideHeaderActions = e.target.closest(".header-actions");

        if (!isClickInsideHeaderActions) {
            logoutBtn.classList.remove("show");
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        window.location.href = "../app/login.html";
    });
}
