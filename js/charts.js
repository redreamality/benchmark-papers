/**
 * charts.js - ECharts 统计图表
 * 三个图表：领域分布柱状图、分类饼图、会议年份分组柱状图
 */

const Charts = (() => {
  let domainChart = null;
  let categoryChart = null;
  let yearConfChart = null;
  let chartsVisible = true;

  // 颜色方案
  const DOMAIN_COLORS = {
    "AI/ML": "#3fb950",
    "CV": "#bc8cff",
    "NLP": "#58a6ff",
    "SE": "#d29922",
    "DB/IR": "#f85149",
  };

  const CATEGORY_COLORS = [
    "#58a6ff", "#3fb950", "#bc8cff", "#d29922", "#f85149",
    "#79c0ff", "#56d364", "#d2a8ff", "#e3b341", "#ff7b72",
    "#a5d6ff", "#7ee787", "#e8d4f8", "#f0c746", "#ffa198",
  ];

  /**
   * 初始化图表
   */
  function init() {
    domainChart = echarts.init(document.getElementById("chart-domain"));
    categoryChart = echarts.init(document.getElementById("chart-category"));
    yearConfChart = echarts.init(document.getElementById("chart-year-conf"));

    // 图表切换按钮
    document.getElementById("btn-toggle-charts").addEventListener("click", () => {
      chartsVisible = !chartsVisible;
      const wrapper = document.getElementById("charts-wrapper");
      const btn = document.getElementById("btn-toggle-charts");
      if (chartsVisible) {
        wrapper.classList.remove("collapsed");
        btn.textContent = "Charts \u25BC";
        setTimeout(() => resize(), 100);
      } else {
        wrapper.classList.add("collapsed");
        btn.textContent = "Charts \u25B6";
      }
    });

    // 窗口 resize
    window.addEventListener("resize", resize);
  }

  /**
   * 更新所有图表
   */
  function update(papers) {
    if (!chartsVisible) return;
    updateDomainChart(papers);
    updateCategoryChart(papers);
    updateYearConfChart(papers);
  }

  function resize() {
    if (domainChart) domainChart.resize();
    if (categoryChart) categoryChart.resize();
    if (yearConfChart) yearConfChart.resize();
  }

  /**
   * 领域分布柱状图
   */
  function updateDomainChart(papers) {
    const counts = {};
    papers.forEach(p => {
      counts[p.domain] = (counts[p.domain] || 0) + 1;
    });

    const domains = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const values = domains.map(d => counts[d]);
    const colors = domains.map(d => DOMAIN_COLORS[d] || "#58a6ff");

    domainChart.setOption({
      title: {
        text: "Papers by Domain",
        left: "center",
        textStyle: { color: "#8b949e", fontSize: 13, fontWeight: 500 },
      },
      tooltip: { trigger: "axis" },
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: "category",
        data: domains,
        axisLabel: { color: "#8b949e", fontSize: 11 },
        axisLine: { lineStyle: { color: "#30363d" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#8b949e", fontSize: 11 },
        axisLine: { lineStyle: { color: "#30363d" } },
        splitLine: { lineStyle: { color: "#21262d" } },
      },
      series: [{
        type: "bar",
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i] },
        })),
        barWidth: "50%",
        label: {
          show: true,
          position: "top",
          color: "#8b949e",
          fontSize: 11,
        },
      }],
    }, true);
  }

  /**
   * 分类饼图
   */
  function updateCategoryChart(papers) {
    const counts = {};
    papers.forEach(p => {
      const cat = p.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const data = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    categoryChart.setOption({
      title: {
        text: "Papers by Category",
        left: "center",
        textStyle: { color: "#8b949e", fontSize: 13, fontWeight: 500 },
      },
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
      },
      series: [{
        type: "pie",
        radius: ["30%", "65%"],
        center: ["50%", "55%"],
        data: data,
        label: {
          color: "#8b949e",
          fontSize: 10,
          formatter: (params) => {
            if (params.percent < 3) return "";
            // Shorten long names
            const name = params.name.length > 20
              ? params.name.substring(0, 18) + "..."
              : params.name;
            return `${name}\n${params.percent}%`;
          },
        },
        labelLine: {
          lineStyle: { color: "#30363d" },
        },
        itemStyle: {
          borderColor: "#161b22",
          borderWidth: 2,
        },
        color: CATEGORY_COLORS,
      }],
    }, true);
  }

  /**
   * 会议-年份分组柱状图
   */
  function updateYearConfChart(papers) {
    // 按年份和会议分组
    const years = [...new Set(papers.map(p => p.year))].sort();
    const conferences = [...new Set(papers.map(p => p.conference))].sort();

    const matrix = {};
    papers.forEach(p => {
      const key = `${p.conference}_${p.year}`;
      matrix[key] = (matrix[key] || 0) + 1;
    });

    // 过滤掉数量太少的会议（只显示有数据的）
    const confWithData = conferences.filter(conf =>
      years.some(y => (matrix[`${conf}_${y}`] || 0) > 0)
    );

    const series = confWithData.map((conf, i) => ({
      name: conf,
      type: "bar",
      stack: "total",
      data: years.map(y => matrix[`${conf}_${y}`] || 0),
      itemStyle: {
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      },
    }));

    yearConfChart.setOption({
      title: {
        text: "Papers by Year & Conference",
        left: "center",
        textStyle: { color: "#8b949e", fontSize: 13, fontWeight: 500 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#8b949e", fontSize: 10 },
        type: "scroll",
      },
      grid: { left: 50, right: 20, top: 40, bottom: 60 },
      xAxis: {
        type: "category",
        data: years.map(String),
        axisLabel: { color: "#8b949e", fontSize: 11 },
        axisLine: { lineStyle: { color: "#30363d" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#8b949e", fontSize: 11 },
        axisLine: { lineStyle: { color: "#30363d" } },
        splitLine: { lineStyle: { color: "#21262d" } },
      },
      series: series,
    }, true);
  }

  return { init, update, resize };
})();
