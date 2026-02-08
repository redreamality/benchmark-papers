/**
 * filters.js - 多维度筛选逻辑 + URL 参数同步
 *
 * 筛选逻辑: 同维度 OR，跨维度 AND
 * 例: domain=[AI/ML OR CV] AND year=[2024] AND keyword=[benchmark]
 */

const Filters = (() => {
  // 当前筛选状态
  const state = {
    search: "",
    domain: [],      // 多选
    category: [],    // 多选
    conference: [],  // 多选
    year: [],        // 多选
    keyword: [],     // 多选
  };

  // Fuse.js 实例
  let fuse = null;
  let allPapers = [];
  let onFilterChange = null;

  /**
   * 初始化筛选器
   */
  function init(papers, callback) {
    allPapers = papers;
    onFilterChange = callback;

    // 初始化 Fuse.js 模糊搜索
    fuse = new Fuse(papers, {
      keys: ["title"],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    // 生成筛选选项
    renderChips();

    // 从 URL 恢复状态
    loadFromURL();

    // 绑定事件
    bindEvents();

    // 触发初始筛选
    applyFilters();
  }

  /**
   * 生成筛选 chips
   */
  function renderChips() {
    // 提取唯一值和计数
    const domains = countBy(allPapers, "domain");
    const categories = countBy(allPapers, "category");
    const conferences = countBy(allPapers, "conference");
    const years = countBy(allPapers, "year");
    const keywords = countKeywords(allPapers);

    renderChipGroup("filter-domain", domains, "domain");
    renderChipGroup("filter-category", categories, "category");
    renderChipGroup("filter-conference", conferences, "conference");
    renderChipGroup("filter-year", years, "year", true);
    renderChipGroup("filter-keyword", keywords, "keyword");
  }

  function countBy(papers, field) {
    const counts = {};
    papers.forEach(p => {
      const val = p[field];
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }

  function countKeywords(papers) {
    const counts = {};
    papers.forEach(p => {
      (p.matchedKeywords || []).forEach(kw => {
        counts[kw] = (counts[kw] || 0) + 1;
      });
    });
    return counts;
  }

  function renderChipGroup(containerId, countMap, filterKey, sortNumeric = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let keys = Object.keys(countMap);
    if (sortNumeric) {
      keys.sort((a, b) => Number(a) - Number(b));
    } else {
      keys.sort((a, b) => countMap[b] - countMap[a]);
    }

    container.innerHTML = keys.map(key => {
      const count = countMap[key];
      const active = state[filterKey].includes(key) ? "active" : "";
      return `<span class="chip ${active}" data-filter="${filterKey}" data-value="${key}">
        ${key}<span class="chip-count">(${count})</span>
      </span>`;
    }).join("");
  }

  /**
   * 绑定事件
   */
  function bindEvents() {
    // Chip 点击
    document.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;

      const filterKey = chip.dataset.filter;
      const value = chip.dataset.value;

      if (state[filterKey].includes(value)) {
        state[filterKey] = state[filterKey].filter(v => v !== value);
        chip.classList.remove("active");
      } else {
        state[filterKey].push(value);
        chip.classList.add("active");
      }

      applyFilters();
    });

    // 搜索框
    const searchInput = document.getElementById("search-input");
    let searchTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = searchInput.value.trim();
        applyFilters();
      }, 200);
    });

    // 重置按钮
    document.getElementById("btn-reset").addEventListener("click", resetFilters);
  }

  /**
   * 应用筛选
   */
  function applyFilters() {
    let result = allPapers;

    // 模糊搜索
    if (state.search) {
      const searchResults = fuse.search(state.search);
      const matchedIds = new Set(searchResults.map(r => r.item.id));
      result = result.filter(p => matchedIds.has(p.id));
    }

    // 多维度筛选: 同维度 OR, 跨维度 AND
    if (state.domain.length > 0) {
      result = result.filter(p => state.domain.includes(p.domain));
    }
    if (state.category.length > 0) {
      result = result.filter(p => state.category.includes(p.category));
    }
    if (state.conference.length > 0) {
      result = result.filter(p => state.conference.includes(p.conference));
    }
    if (state.year.length > 0) {
      result = result.filter(p => state.year.includes(String(p.year)));
    }
    if (state.keyword.length > 0) {
      result = result.filter(p =>
        state.keyword.some(kw => (p.matchedKeywords || []).includes(kw))
      );
    }

    // 更新 URL
    saveToURL();

    // 更新计数
    updateResultCount(result.length);

    // 回调
    if (onFilterChange) onFilterChange(result);
  }

  /**
   * 重置所有筛选
   */
  function resetFilters() {
    state.search = "";
    state.domain = [];
    state.category = [];
    state.conference = [];
    state.year = [];
    state.keyword = [];

    document.getElementById("search-input").value = "";
    document.querySelectorAll(".chip.active").forEach(c => c.classList.remove("active"));

    applyFilters();
  }

  /**
   * URL 参数同步
   */
  function saveToURL() {
    const params = new URLSearchParams();
    if (state.search) params.set("q", state.search);
    if (state.domain.length) params.set("domain", state.domain.join(","));
    if (state.category.length) params.set("cat", state.category.join(","));
    if (state.conference.length) params.set("conf", state.conference.join(","));
    if (state.year.length) params.set("year", state.year.join(","));
    if (state.keyword.length) params.set("kw", state.keyword.join(","));

    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState(null, "", newURL);
  }

  function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("q")) {
      state.search = params.get("q");
      document.getElementById("search-input").value = state.search;
    }
    if (params.has("domain")) state.domain = params.get("domain").split(",");
    if (params.has("cat")) state.category = params.get("cat").split(",");
    if (params.has("conf")) state.conference = params.get("conf").split(",");
    if (params.has("year")) state.year = params.get("year").split(",");
    if (params.has("kw")) state.keyword = params.get("kw").split(",");

    // 更新 chip 激活状态
    document.querySelectorAll(".chip").forEach(chip => {
      const key = chip.dataset.filter;
      const val = chip.dataset.value;
      if (state[key] && state[key].includes(val)) {
        chip.classList.add("active");
      }
    });
  }

  function updateResultCount(count) {
    const el = document.getElementById("result-count");
    if (el) {
      el.textContent = `Showing ${count.toLocaleString()} / ${allPapers.length.toLocaleString()} papers`;
    }
  }

  /**
   * 获取当前筛选后的论文（供 charts 使用）
   */
  function getFilteredPapers() {
    let result = allPapers;
    if (state.search) {
      const searchResults = fuse.search(state.search);
      const matchedIds = new Set(searchResults.map(r => r.item.id));
      result = result.filter(p => matchedIds.has(p.id));
    }
    if (state.domain.length > 0) result = result.filter(p => state.domain.includes(p.domain));
    if (state.category.length > 0) result = result.filter(p => state.category.includes(p.category));
    if (state.conference.length > 0) result = result.filter(p => state.conference.includes(p.conference));
    if (state.year.length > 0) result = result.filter(p => state.year.includes(String(p.year)));
    if (state.keyword.length > 0) {
      result = result.filter(p => state.keyword.some(kw => (p.matchedKeywords || []).includes(kw)));
    }
    return result;
  }

  return { init, getFilteredPapers, applyFilters };
})();
