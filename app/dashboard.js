import { renderSidebar } from "./js/components/sidebar.js"
const container=document.querySelector(".container");
container.insertAdjacentHTML("afterbegin",renderSidebar("dashboard"));
