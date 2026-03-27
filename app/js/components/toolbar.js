export function renderToolbar({
    searchId = "searchInput",
    searchPlaceholder = "Tìm kiếm...",
    buttonText = "Thêm",
    buttonIcon = "fas fa-plus",
    buttonClass = "btn-add",
    buttonId = "",
    buttonType = "button",
} = {}) {
    return `
    <header class="toolbar">
      <div class="search-bar">
        <input 
          type="text" 
          id="${searchId}" 
          placeholder="${searchPlaceholder}"
        >
      </div>

      <div class="user-actions">
        <button
          type="${buttonType}"
          class="${buttonClass}"
          ${buttonId ? `id="${buttonId}"` : ""}
        >
          <i class="${buttonIcon}"></i> ${buttonText}
        </button>
      </div>
    </header>
  `;
}
