// 1. Nhập các hàm cần thiết từ thư viện CDN của Firebase đám mây
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. ĐẠI BẢN DOANH: Cấu hình chìa khóa kết nối Firebase của em (THAY ĐOẠN NÀY BẰNG CONFIG CỦA EM)
const firebaseConfig = {
  apiKey: "AIzaSyCfOeqfSm4B4TiiHn_HJVLMHUXhPkM1f4g",
  authDomain: "colors-modern.firebaseapp.com",
  databaseURL:
    "https://colors-modern-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "colors-modern",
  storageBucket: "colors-modern.firebasestorage.app",
  messagingSenderId: "735993305588",
  appId: "1:735993305588:web:566978b3eba799d3fbc1a1",
};

// Khởi tạo ứng dụng kết nối Cloud
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const globalColorsRef = ref(db, "global_colors"); // Đặt tên bảng dữ liệu trên mây là "global_colors"

document.addEventListener("DOMContentLoaded", () => {
  // --- TÍNH NĂNG 1: CLICK TO COPY ---
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

  // --- TÍNH NĂNG 2: DIALOG MENU MOBILE (Toán học tọa độ) ---
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const dialogMenu = document.getElementById("mobile-menu-dialog");
  const closeMenuBtn = document.getElementById("close-menu-btn");
  const navLinks = document.querySelectorAll(".main-header__link");

  hamburgerMenu.addEventListener("click", () => {
    dialogMenu.showModal();
  });
  closeMenuBtn.addEventListener("click", () => {
    dialogMenu.close();
  });

  dialogMenu.addEventListener("click", (e) => {
    const rect = dialogMenu.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      dialogMenu.close();
    }
  });
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      dialogMenu.close();
    });
  });

  // --- TÍNH NĂNG 3: COLOR LAB & API TRA CỨU TÊN MÀU ---
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

  // --- TÍNH NĂNG 4: BỘ SƯU TẬP CÁ NHÂN (LOCALSTORAGE) ---
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
    colors.forEach((colorObj, index) => {
      const miniCard = document.createElement("div");
      miniCard.style.cssText = `background: ${colorObj.hex}; color: #fff; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
      miniCard.innerHTML = `<span>${colorObj.name} (${colorObj.hex})</span><button class="delete-btn" data-index="${index}">X</button>`;
      savedColorsGrid.appendChild(miniCard);
    });
    document
      .querySelectorAll("#saved-colors-grid .delete-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const colors = getSavedColors();
          colors.splice(e.target.getAttribute("data-index"), 1);
          localStorage.setItem("myColors", JSON.stringify(colors));
          displaySavedColors();
        });
      });
  }

  // --- TÍNH NĂNG 5: ĐỒNG BỘ TOÀN CẦU (FIREBASE REALTIME DATABASE) ---
  const globalColorsGrid = document.getElementById("global-colors-grid");

  // Nhấn nút lưu: Vừa lưu máy mình, vừa bắn thẳng lên vũ trụ Firebase
  saveColorBtn.addEventListener("click", () => {
    const currentHex = hexInput.value.toUpperCase();
    const currentName = colorNameSpan.textContent;
    if (
      currentName === "Mã màu không hợp lệ" ||
      currentName === "🔄 Đang tra cứu..."
    )
      return;

    // A. Lưu LocalStorage cá nhân
    const localColors = getSavedColors();
    if (!localColors.some((c) => c.hex === currentHex)) {
      localColors.push({ hex: currentHex, name: currentName });
      localStorage.setItem("myColors", JSON.stringify(localColors));
      displaySavedColors();
    }

    // B. ĐẨY LÊN CLOUD DATABASE: Phát sóng cho toàn thế giới nhìn thấy
    push(globalColorsRef, {
      hex: currentHex,
      name: currentName,
      timestamp: Date.now(), // Lưu mốc thời gian để sắp xếp màu mới lên đầu
    }).catch((err) => console.error("Lỗi đẩy lên Cloud:", err));
  });

  // TÍNH NĂNG "THẦN THÁNH": Lắng nghe Cloud biến động liên tục (Real-time Listener)
  onValue(globalColorsRef, (snapshot) => {
    globalColorsGrid.innerHTML = "";
    const data = snapshot.val();

    if (!data) {
      globalColorsGrid.innerHTML =
        '<span style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">Chưa có cao thủ nào lưu màu lên bảng vàng quốc tế.</span>';
      return;
    }

    // Chuyển Object dữ liệu từ Firebase thành mảng và sắp xếp theo thời gian mới nhất
    const items = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);

    // Vẽ danh sách Bảng Vàng Quốc Tế
    items.forEach((colorObj) => {
      const miniCard = document.createElement("div");
      miniCard.style.cssText = `background: ${colorObj.hex}; color: #fff; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.6); display: flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
      miniCard.innerHTML = `<span>${colorObj.name} (${colorObj.hex})</span>`;
      globalColorsGrid.appendChild(miniCard);
    });
  });

  // Kích hoạt nạp dữ liệu lần đầu
  fetchColorName(hexInput.value);
  displaySavedColors();
});
