/* ==========================================================
   GEONWORKS 재고 현황 위젯 — Script
   ----------------------------------------------------------
   1. GAS_URL 의 Google Apps Script 웹앱에서 시트 데이터를 가져옵니다.
   2. 응답 형식은 아래 두 가지를 모두 지원합니다.
      A) 객체 배열
         [{ "분류": "keyboard", "재고상태": "재고있음",
            "제품명": "FROG TKL Barebone Kit",
            "최종 편집 일시": "2025-01-16T10:00:00" }, ...]
      B) 2차원 배열 (1행 = 헤더)
         [["분류","재고상태","제품명","최종 편집 일시"],
          ["keyboard","재고있음","FROG TKL Barebone Kit","2025-01-16T10:00:00"], ...]
   3. 1분(REFRESH_INTERVAL_MS)마다 자동 새로고침 + 수동 새로고침 버튼 지원.
   4. 이 페이지는 표시 전용입니다. 데이터 수정/관리는 구글 시트에서만 가능합니다.
   ========================================================== */

(function () {
  "use strict";

  // ----------------------------------------------------------
  // 설정
  // ----------------------------------------------------------

  // TODO: 실제 배포 후에는 Apps Script 새 배포 URL로 교체하세요.
  var GAS_URL =
    "https://script.google.com/macros/s/AKfycbzqEloBHEeXHIG8ht3OEllSQhTF-jiC06uo3JAljrtVE0Y7oS5nGhK0B6sLJv8NtYq2lw/exec";

  var REFRESH_INTERVAL_MS = 60 * 1000; // 1분마다 자동 새로고침

  // 시트 헤더 → 내부 필드명 매핑 (헤더 표기가 달라도 매칭되도록 후보를 여러 개 등록)
  var FIELD_ALIASES = {
    category: ["분류", "category", "Category"],
    stock: ["재고상태", "stock", "Stock", "재고 상태"],
    name: ["제품명", "name", "Name", "product", "제품 이름"],
    updated: [
      "최종 편집 일시",
      "최종편집일시",
      "updated",
      "Updated",
      "최종 수정 일시",
    ],
  };

  // 재고상태 표준 분류 (배지 색상 매핑용)
  var STOCK_LEVELS = {
    in: { label: "재고있음", className: "in" },
    low: { label: "재고부족", className: "low" },
    out: { label: "재고없음", className: "out" },
  };

  // ----------------------------------------------------------
  // 상태
  // ----------------------------------------------------------

  var allItems = [];
  var activeCategory = "전체";
  var activeStock = "전체";
  var searchTerm = "";
  var refreshTimer = null;

  // ----------------------------------------------------------
  // DOM
  // ----------------------------------------------------------

  var root = document.getElementById("gwStock");
  if (!root) return; // 위젯이 페이지에 없으면 그대로 종료

  var tabsEl = document.getElementById("gwCategoryTabs");
  var pillsEl = document.getElementById("gwStockPills");
  var gridEl = document.getElementById("gwGrid");
  var searchEl = document.getElementById("gwSearchInput");
  var updatedEl = document.getElementById("gwUpdated");
  var refreshBtn = document.getElementById("gwRefreshBtn");

  // ----------------------------------------------------------
  // 데이터 정규화
  // ----------------------------------------------------------

  function findKey(rowKeys, aliases) {
    for (var i = 0; i < aliases.length; i++) {
      var idx = rowKeys.indexOf(aliases[i]);
      if (idx !== -1) return rowKeys[idx];
    }
    return null;
  }

  function classifyStock(rawStock) {
    var v = (rawStock || "").toString().trim();
    if (v.indexOf("부족") !== -1) return STOCK_LEVELS.low;
    if (v.indexOf("없음") !== -1) return STOCK_LEVELS.out;
    if (v.indexOf("있음") !== -1) return STOCK_LEVELS.in;
    // 알 수 없는 값은 "재고있음" 취급하지 않고 별도 표시
    return { label: v || "확인 필요", className: "low" };
  }

  // 응답을 항상 { category, stock, name, updated } 객체 배열로 변환
  function normalize(raw) {
    var rows = raw;

    // 서버가 { data: [...] } 형태로 감싸서 줄 수도 있음
    if (raw && !Array.isArray(raw) && Array.isArray(raw.data)) {
      rows = raw.data;
    }

    if (!Array.isArray(rows) || rows.length === 0) return [];

    // B) 2차원 배열(첫 행 = 헤더) 형태인 경우 객체 배열로 변환
    if (Array.isArray(rows[0])) {
      var headers = rows[0];
      var objRows = [];
      for (var i = 1; i < rows.length; i++) {
        var obj = {};
        for (var c = 0; c < headers.length; c++) {
          obj[headers[c]] = rows[i][c];
        }
        objRows.push(obj);
      }
      rows = objRows;
    }

    var keys = Object.keys(rows[0] || {});
    var catKey = findKey(keys, FIELD_ALIASES.category);
    var stockKey = findKey(keys, FIELD_ALIASES.stock);
    var nameKey = findKey(keys, FIELD_ALIASES.name);
    var updatedKey = findKey(keys, FIELD_ALIASES.updated);

    return rows
      .map(function (row) {
        var name = nameKey ? row[nameKey] : "";
        if (!name) return null; // 빈 행 제외

        return {
          category: (catKey ? row[catKey] : "기타") || "기타",
          stock: classifyStock(stockKey ? row[stockKey] : ""),
          name: String(name).trim(),
          updated: updatedKey ? row[updatedKey] : "",
        };
      })
      .filter(Boolean);
  }

  // ----------------------------------------------------------
  // 렌더링
  // ----------------------------------------------------------

  function renderTabs() {
    var categories = ["전체"];
    var counts = { 전체: allItems.length };

    allItems.forEach(function (item) {
      if (categories.indexOf(item.category) === -1) {
        categories.push(item.category);
        counts[item.category] = 0;
      }
      counts[item.category] += 1;
    });

    tabsEl.innerHTML = "";

    categories.forEach(function (cat, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gw-tab" + (cat === activeCategory ? " is-active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", cat === activeCategory);

      var labelText = idx === 0 ? "ALL" : "CATEGORY";

      btn.innerHTML =
        '<span class="gw-tab__label">' +
        labelText +
        '</span><span class="gw-tab__value">' +
        escapeHtml(cat) +
        '</span><span class="gw-tab__count">' +
        counts[cat] +
        "개 품목</span>";

      btn.addEventListener("click", function () {
        activeCategory = cat;
        renderTabs();
        renderGrid();
      });

      tabsEl.appendChild(btn);
    });
  }

  function renderPills() {
    var stockOptions = [
      { key: "전체", label: "전체" },
      { key: "in", label: "재고있음" },
      { key: "low", label: "재고부족" },
      { key: "out", label: "재고없음" },
    ];

    pillsEl.innerHTML = "";

    stockOptions.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "gw-pill" + (opt.key === activeStock ? " is-active" : "");
      btn.textContent = opt.label;

      btn.addEventListener("click", function () {
        activeStock = opt.key;
        renderPills();
        renderGrid();
      });

      pillsEl.appendChild(btn);
    });
  }

  function renderGrid() {
    var filtered = allItems.filter(function (item) {
      var matchCategory =
        activeCategory === "전체" || item.category === activeCategory;
      var matchStock =
        activeStock === "전체" || item.stock.className === activeStock;
      var matchSearch =
        !searchTerm ||
        item.name.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1;
      return matchCategory && matchStock && matchSearch;
    });

    gridEl.innerHTML = "";

    if (filtered.length === 0) {
      var empty = document.createElement("p");
      empty.className = "gw-state";
      empty.textContent = "조건에 맞는 재고 정보가 없습니다.";
      gridEl.appendChild(empty);
      return;
    }

    filtered.forEach(function (item) {
      var card = document.createElement("div");
      card.className =
        "gw-card" + (item.stock.className === "out" ? " is-out" : "");

      card.innerHTML =
        '<span class="gw-card__category">' +
        escapeHtml(item.category) +
        '</span>' +
        '<span class="gw-card__name">' +
        escapeHtml(item.name) +
        '</span>' +
        '<span class="gw-card__footer">' +
        '<span class="gw-card__badge gw-card__badge--' +
        item.stock.className +
        '"><span class="gw-dot gw-dot--' +
        item.stock.className +
        '"></span>' +
        escapeHtml(item.stock.label) +
        "</span></span>";

      gridEl.appendChild(card);
    });
  }

  function renderError(message) {
    gridEl.innerHTML =
      '<div class="gw-state gw-state--error">' +
      escapeHtml(message) +
      '<br><button type="button" class="gw-state__retry" id="gwRetryBtn">다시 시도</button></div>';

    var retryBtn = document.getElementById("gwRetryBtn");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        loadData();
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ----------------------------------------------------------
  // 데이터 로드
  // ----------------------------------------------------------

  function setLoadingState(isLoading) {
    if (refreshBtn) refreshBtn.disabled = isLoading;
  }

  function loadData() {
    setLoadingState(true);

    if (allItems.length === 0) {
      gridEl.innerHTML =
        '<p class="gw-state gw-state--loading">재고 정보를 불러오는 중입니다…</p>';
    }

    fetch(GAS_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("서버 응답 오류 (" + res.status + ")");
        return res.json();
      })
      .then(function (json) {
        var items = normalize(json);

        if (items.length === 0) {
          throw new Error("표시할 재고 데이터가 없습니다.");
        }

        allItems = items;
        renderTabs();
        renderPills();
        renderGrid();
        updateTimestamp();
      })
      .catch(function (err) {
        console.error("[GEONWORKS 재고] 데이터 로드 실패:", err);
        renderError(
          "To be Continued... This service will open."
        );
        if (updatedEl) updatedEl.textContent = "업데이트 실패";
      })
      .finally(function () {
        setLoadingState(false);
      });
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function updateTimestamp() {
    if (!updatedEl) return;
    var now = new Date();
    updatedEl.textContent =
      now.getFullYear() +
      "." +
      pad2(now.getMonth() + 1) +
      "." +
      pad2(now.getDate()) +
      " " +
      pad2(now.getHours()) +
      ":" +
      pad2(now.getMinutes());
  }

  // ----------------------------------------------------------
  // 이벤트 바인딩
  // ----------------------------------------------------------

  if (searchEl) {
    searchEl.addEventListener("input", function (e) {
      searchTerm = e.target.value.trim();
      renderGrid();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      loadData();
    });
  }

  // ----------------------------------------------------------
  // 초기 실행 + 자동 새로고침
  // ----------------------------------------------------------

  loadData();

  refreshTimer = window.setInterval(loadData, REFRESH_INTERVAL_MS);

  // 페이지를 벗어날 때 타이머 정리 (SPA 환경 대비)
  window.addEventListener("beforeunload", function () {
    if (refreshTimer) window.clearInterval(refreshTimer);
  });
})();
