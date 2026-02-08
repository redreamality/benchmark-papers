/**
 * app.js - 主逻辑：数据加载 + Tabulator 表格初始化
 */

(async function () {
  "use strict";

  // --- 数据加载 ---
  let allPapers = [];
  let table = null;

  try {
    const resp = await fetch("data/papers.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    allPapers = await resp.json();
  } catch (err) {
    console.error("Failed to load papers.json:", err);
    document.getElementById("result-count").textContent = "Error loading data";
    return;
  }

  // --- Domain CSS class 映射 ---
  function domainClass(domain) {
    const map = {
      "AI/ML": "aiml",
      "CV": "cv",
      "NLP": "nlp",
      "SE": "se",
      "DB/IR": "dbir",
    };
    return map[domain] || "";
  }

  // --- Tabulator 表格 ---
  table = new Tabulator("#papers-table", {
    data: allPapers,
    layout: "fitColumns",
    pagination: true,
    paginationSize: 50,
    paginationSizeSelector: [25, 50, 100, true],
    paginationCounter: "rows",
    placeholder: "No papers match the current filters",
    movableColumns: false,
    resizableRows: false,
    responsiveLayout: "collapse",
    rowFormatter: function (row) {
      const data = row.getData();
      if (data.abstract) {
        row.getElement().title = "Click to expand abstract";
      }
    },
    columns: [
      {
        title: "#",
        field: "id",
        width: 55,
        hozAlign: "center",
        headerSort: true,
        resizable: false,
      },
      {
        title: "Title",
        field: "title",
        minWidth: 300,
        formatter: function (cell) {
          const data = cell.getRow().getData();
          if (data.url) {
            return `<a class="paper-title-link" href="${escapeHtml(data.url)}" target="_blank" rel="noopener">${escapeHtml(data.title)}</a>`;
          }
          return `<span class="paper-title-nolink">${escapeHtml(data.title)}</span>`;
        },
        headerSort: true,
        tooltip: false,
      },
      {
        title: "Conference",
        field: "conference",
        width: 100,
        hozAlign: "center",
        formatter: function (cell) {
          return `<span class="conf-badge">${escapeHtml(cell.getValue())}</span>`;
        },
        headerSort: true,
      },
      {
        title: "Year",
        field: "year",
        width: 70,
        hozAlign: "center",
        headerSort: true,
      },
      {
        title: "Domain",
        field: "domain",
        width: 90,
        hozAlign: "center",
        formatter: function (cell) {
          const val = cell.getValue();
          return `<span class="domain-badge ${domainClass(val)}">${escapeHtml(val)}</span>`;
        },
        headerSort: true,
      },
      {
        title: "Category",
        field: "category",
        width: 200,
        formatter: function (cell) {
          return escapeHtml(cell.getValue() || "");
        },
        headerSort: true,
      },
      {
        title: "Subcategory",
        field: "subcategory",
        width: 180,
        formatter: function (cell) {
          return escapeHtml(cell.getValue() || "");
        },
        headerSort: true,
      },
    ],
  });

  // --- 行点击展开摘要 ---
  table.on("rowClick", function (e, row) {
    // 不要拦截链接点击
    if (e.target.closest("a")) return;

    const data = row.getData();
    if (!data.abstract) return;

    const el = row.getElement();
    const existing = el.nextElementSibling;

    if (existing && existing.classList.contains("abstract-row")) {
      existing.remove();
      return;
    }

    const abstractDiv = document.createElement("div");
    abstractDiv.className = "abstract-row";
    abstractDiv.textContent = data.abstract;
    el.after(abstractDiv);
  });

  // --- 初始化筛选器 ---
  Filters.init(allPapers, function (filteredPapers) {
    table.setData(filteredPapers);
    Charts.update(filteredPapers);
  });

  // --- 初始化图表 ---
  Charts.init();
  Charts.update(allPapers);

  // --- CSV 导出 ---
  document.getElementById("btn-export").addEventListener("click", function () {
    const filtered = Filters.getFilteredPapers();
    exportCSV(filtered);
  });

  function exportCSV(papers) {
    const headers = ["id", "title", "conference", "year", "domain", "category", "subcategory", "url", "matchedKeywords"];
    const rows = papers.map(p =>
      headers.map(h => {
        let val = p[h];
        if (Array.isArray(val)) val = val.join("; ");
        if (val == null) val = "";
        // CSV escape
        val = String(val);
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmark_papers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- HTML 转义 ---
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
