document.addEventListener("DOMContentLoaded", () => {
  // --- 1. TÍNH NĂNG CLICK TO COPY ---
  const colorCodes = document.querySelectorAll(".color-card__code");
  colorCodes.forEach((codeElement) => {
    codeElement.style.cursor = "pointer";
    codeElement.addEventListener("click", async () => {
      const colorText = codeElement.textContent;
      try {
        await navigator.clipboard.writeText(colorText);
        const originalText = colorText;
        codeElement.textContent = "✓ Đã sao chép thành công!";
        setTimeout(() => (codeElement.textContent = originalText), 1500);
      } catch (err) {
        console.error(err);
      }
    });
  });

  // --- 2. TÍNH NĂNG DIALOG MENU MOBILE (NÂNG CẤP) ---
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const dialogMenu = document.getElementById("mobile-menu-dialog");
  const closeMenuBtn = document.getElementById("close-menu-btn"); // Nút X mới
  const navLinks = document.querySelectorAll(".main-header__link");

  // Bấm nút Hamburger ở ngoài -> Mở Dialog
  hamburgerMenu.addEventListener("click", () => {
    dialogMenu.showModal();
  });

  // Bấm nút X ở trong -> Đóng Dialog
  closeMenuBtn.addEventListener("click", () => {
    dialogMenu.close();
  });

  // Bấm ra vùng ngoài màn hình (lớp nền mờ) -> Cũng tự đóng Dialog
  dialogMenu.addEventListener("click", (e) => {
    // 1. Lấy ra khung tọa độ vị trí thực tế của hộp Menu trắng (Bốn cạnh: Trên, Dưới, Trái, Phải)
    const rect = dialogMenu.getBoundingClientRect();

    // 2. Logic kiểm tra: Nếu vị trí click của chuột (clientX, clientY)
    // nằm HOÀN TOÀN RA NGOÀI phạm vi 4 cạnh của hộp Menu...
    const isClickOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;

    // 3. ...Thì trình duyệt hiểu là user đang click trúng vào lớp nền mờ ::backdrop -> Đóng menu!
    if (isClickOutside) {
      hamburgerMenu.classList.remove("is-open"); // Trả nút hamburger về 3 gạch
      dialogMenu.close(); // Đóng cửa sổ dialog
    }
  });

  // Bấm vào các link menu -> Di chuyển đến khu vực và tự đóng Dialog
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      dialogMenu.close();
    });
  });

  // --- 3. TÍNH NĂNG COLOR LAB & FETCH API ---
  const hexInput = document.getElementById("hex-input");
  const colorPreview = document.getElementById("color-preview");
  const colorNameSpan = document.getElementById("color-name");

  async function fetchColorName(hexValue) {
    const cleanHex = hexValue.replace("#", "");
    colorNameSpan.textContent = "🔄 Đang tra cứu...";
    try {
      const response = await fetch(
        `https://www.thecolorapi.com/id?hex=${cleanHex}`,
      );
      const data = await response.json();
      colorNameSpan.textContent = data.name?.value || "Không rõ tên";
    } catch (error) {
      colorNameSpan.textContent = "❌ Lỗi kết nối";
    }
  }

  hexInput.addEventListener("input", (e) => {
    let value = e.target.value.trim();
    const hexRegex = /^#?([0-9a-fA-F]{3}){1,2}$/;
    if (hexRegex.test(value)) {
      if (!value.startsWith("#")) value = "#" + value;
      colorPreview.style.backgroundColor = value;
      colorPreview.textContent = value.toUpperCase();
      fetchColorName(value);
    } else {
      colorNameSpan.textContent = "Mã màu không hợp lệ";
    }
  });

  // --- 4. TÍNH NĂNG LƯU TRỮ LOCALSTORAGE ---
  const saveColorBtn = document.getElementById("save-color-btn");
  const savedColorsGrid = document.getElementById("saved-colors-grid");

  function getSavedColors() {
    const colors = localStorage.getItem("myColors");
    return colors ? JSON.parse(colors) : [];
  }

  function displaySavedColors() {
    const colors = getSavedColors();
    savedColorsGrid.innerHTML = "";
    if (colors.length === 0) {
      savedColorsGrid.innerHTML =
        '<span style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">Chưa có màu nào được lưu.</span>';
      return;
    }
    // Duyệt mảng màu và tạo các thẻ mini-card (Tìm đoạn này trong script.js và cập nhật)
    colors.forEach((colorObj, index) => {
      const miniCard = document.createElement("div");
      miniCard.style.cssText = `
                background: ${colorObj.hex}; 
                color: #fff; 
                padding: 0.5rem 1rem; 
                border-radius: 6px; 
                font-size: 0.85rem; 
                font-weight: bold; 
                text-shadow: 1px 1px 2px rgba(0,0,0,0.6); 
                display: flex; 
                align-items: center; 
                gap: 12px; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;

      // NÂNG CẤP: Ép kiểu dáng nổi bật cho nút Xóa (Nút X)
      miniCard.innerHTML = `
    <span>${colorObj.name} (${colorObj.hex})</span>
    <button class="delete-btn" data-index="${index}">X</button>
`;
      savedColorsGrid.appendChild(miniCard);
    });
  }

  saveColorBtn.addEventListener("click", () => {
    const currentHex = hexInput.value.toUpperCase();
    const currentName = colorNameSpan.textContent;
    if (
      currentName === "Mã màu không hợp lệ" ||
      currentName === "🔄 Đang tra cứu..."
    )
      return;
    const colors = getSavedColors();
    if (colors.some((c) => c.hex === currentHex)) {
      alert("Màu này đã có rồi nhé!");
      return;
    }
    colors.push({ hex: currentHex, name: currentName });
    localStorage.setItem("myColors", JSON.stringify(colors));
    displaySavedColors();
  });

  function deleteColor(index) {
    const colors = getSavedColors();
    colors.splice(index, 1);
    localStorage.setItem("myColors", JSON.stringify(colors));
    displaySavedColors();
  }

  // Chạy kích hoạt dữ liệu ban đầu
  fetchColorName(hexInput.value);
  displaySavedColors();
});
