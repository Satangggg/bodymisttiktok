/* =========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า + กรอง mood
   - order.html   : เติมฟอร์มจาก URL + ส่งออเดอร์
   - admin.html   : แสดงออเดอร์จาก Google Sheet (CSV)
   ========================================================= */

(function () {
  "use strict";

  /* ---------- ค่าคงที่ ---------- */
  var APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzqM3GKzHxi8uIVqH59MGSC1Vbw_BP1GqkTVheWskx73l2cxA2gB6mdME6j46NkeTfERQ/exec";

  var SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6UGaZCErBkkRIzFF9sjmL-cmyH7vCVZLVX4x9PVJk6MZUn5H_89M7Ub-jA4eztbMW2YUZ7Zqz05t1/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  var MOOD_LABELS = {
    fresh: "Fresh",
    sweet: "Sweet",
    confident: "Confident",
    romance: "Romance"
  };

  /* ---------- helper ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function formatPrice(value) {
    var n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString("th-TH");
  }

  /* =========================================================
     1) หน้า product.html
     ========================================================= */
  function initProductPage() {
    var filterBar = document.getElementById("filter-bar");
    var list = document.getElementById("product-list");
    if (!filterBar || !list) return;

    var products = [];
    var validMoods = MOODS.map(function (m) { return m.key; });

    var params = new URLSearchParams(window.location.search);
    var requested = (params.get("mood") || "all").toLowerCase();
    var currentMood = validMoods.indexOf(requested) !== -1 ? requested : "all";

    function buildFilterBar() {
      filterBar.textContent = "";
      MOODS.forEach(function (m) {
        var btn = el("button", "filter-btn");
        btn.type = "button";
        btn.dataset.mood = m.key;

        if (m.key !== "all") {
          var dotWrap = el("span", "mood-dot");
          dotWrap.setAttribute("aria-hidden", "true");
          btn.setAttribute("data-mood", m.key); // ให้ --mood ทำงานกับ .mood-dot
          btn.appendChild(dotWrap);
        }

        btn.appendChild(document.createTextNode(m.label));
        btn.addEventListener("click", function () {
          setMood(m.key);
        });
        filterBar.appendChild(btn);
      });
      updateActiveButton();
    }

    function updateActiveButton() {
      var buttons = filterBar.querySelectorAll(".filter-btn");
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.dataset.mood === currentMood;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function setMood(mood) {
      currentMood = mood;
      updateActiveButton();
      renderProducts();

      // อัปเดต URL ให้แชร์ลิงก์ที่กรองแล้วได้ (ไม่โหลดหน้าใหม่)
      var url = new URL(window.location.href);
      if (mood === "all") {
        url.searchParams.delete("mood");
      } else {
        url.searchParams.set("mood", mood);
      }
      window.history.replaceState(null, "", url.toString());
    }

    function createCard(p) {
      var card = el("article", "product-card");
      card.setAttribute("data-mood", p.mood);

      // รูป
      var media = el("div", "product-card__media");
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);
      card.appendChild(media);

      // เนื้อหา
      var body = el("div", "product-card__body");
      body.appendChild(el("h3", "product-card__name", p.name));

      var meta = el("div", "product-card__meta");
      var sizeText = p.size ? p.size : p.type === "rollon" ? "โรลออน" : "";
      var moodTag = el("span", "mood-tag", MOOD_LABELS[p.mood] || p.mood);
      meta.appendChild(moodTag);
      if (sizeText) {
        meta.appendChild(document.createTextNode("  ·  " + sizeText));
      }
      body.appendChild(meta);

      // ราคา + ปุ่มสั่งซื้อ
      var footer = el("div", "product-card__footer");
      var price = el("span", "price", formatPrice(p.price));
      price.appendChild(el("small", null, "บาท"));
      footer.appendChild(price);

      var orderLink = el("a", "btn btn--small", "สั่งซื้อ");
      orderLink.href =
        "order.html?item=" + encodeURIComponent(p.name) +
        "&price=" + encodeURIComponent(p.price);
      footer.appendChild(orderLink);

      body.appendChild(footer);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      list.textContent = "";
      var visible = products.filter(function (p) {
        return currentMood === "all" || p.mood === currentMood;
      });

      if (visible.length === 0) {
        list.appendChild(el("p", "text-center", "ยังไม่มีสินค้าในหมวดนี้"));
        return;
      }

      visible.forEach(function (p) {
        list.appendChild(createCard(p));
      });
    }

    buildFilterBar();

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        renderProducts();
      })
      .catch(function (error) {
        console.error(error);
        list.textContent = "";
        list.appendChild(
          el("p", "text-center", "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง")
        );
      });
  }

  /* =========================================================
     2) หน้า order.html
     ========================================================= */
  function initOrderPage() {
    var form = document.getElementById("orderForm");
    if (!form) return;

    var itemsInput = document.getElementById("items");
    var totalInput = document.getElementById("total");

    // เติมค่าจาก URL parameter ทันทีที่โหลดหน้า
    var params = new URLSearchParams(window.location.search);
    var item = params.get("item");
    var price = params.get("price");

    if (itemsInput && item) {
      itemsInput.value = item;
    }
    if (totalInput && price) {
      totalInput.value = price; // ต้องเติมช่อง total ด้วยเสมอ
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      function val(id) {
        var node = document.getElementById(id);
        return node ? node.value.trim() : "";
      }

      var payload = {
        customerName: val("customerName"),
        contact: val("contact"),
        items: val("items"),
        total: val("total"),
        note: val("note")
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      })
        .then(function () {
          window.location.href = "thankyou.html";
        })
        .catch(function (error) {
          console.error(error);
          alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* =========================================================
     3) หน้า admin.html
     ========================================================= */

  // parse CSV เอง: รองรับ "ข้อความมี, คอมมา", "" (quote ซ้อน) และขึ้นบรรทัดใหม่ในเซลล์
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทั้งแถว
    return rows.filter(function (r) {
      return r.some(function (cell) {
        return cell.trim() !== "";
      });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;

    var COLUMN_COUNT = 6;

    function showMessage(message) {
      tbody.textContent = "";
      var tr = document.createElement("tr");
      var td = el("td", "text-center", message);
      td.colSpan = COLUMN_COUNT;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage("กำลังโหลดข้อมูล...");

    fetch(SHEET_CSV_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        // แถวแรกคือหัวคอลัมน์ของชีต
        var data = rows.slice(1);

        if (data.length === 0) {
          showMessage("ยังไม่มีรายการสั่งซื้อ");
          return;
        }

        // ชีตเพิ่มแถวใหม่ต่อท้ายเสมอ จึงกลับลำดับให้รายการล่าสุดขึ้นก่อน
        data.reverse();

        tbody.textContent = "";
        data.forEach(function (r) {
          var tr = document.createElement("tr");
          for (var c = 0; c < COLUMN_COUNT; c++) {
            var value = r[c] !== undefined ? r[c].trim() : "";
            if (c === 4 && value !== "" && !isNaN(Number(value))) {
              value = formatPrice(value); // จำนวนเงินรวม
            }
            tr.appendChild(el("td", null, value));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      });
  }

  /* ---------- เริ่มทำงานตามหน้าที่เปิดอยู่ ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
