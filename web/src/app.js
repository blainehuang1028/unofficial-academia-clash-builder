import {
  ACADEMIA_TEMPLATE_PRESETS,
  DEFAULT_TEMPLATE_URL,
  FALLBACK_GROUP_DEFAULT,
  defaultOutputName,
  transformClashConfig,
} from "./transform.js";

const state = {
  output: "",
  outputName: defaultOutputName("mobile"),
};

const els = {
  templatePreset: document.querySelector("#template-preset"),
  templateFile: document.querySelector("#template-file"),
  templateUrl: document.querySelector("#template-url"),
  templateText: document.querySelector("#template-text"),
  nodesFile: document.querySelector("#nodes-file"),
  nodesUrl: document.querySelector("#nodes-url"),
  nodesText: document.querySelector("#nodes-text"),
  outputName: document.querySelector("#output-name"),
  platform: document.querySelector("#platform"),
  fallbackRegion: document.querySelector("#fallback-region"),
  fallbackGroup: document.querySelector("#fallback-group"),
  hideMissing: document.querySelector("#hide-missing"),
  generate: document.querySelector("#generate"),
  download: document.querySelector("#download"),
  status: document.querySelector("#status"),
  report: document.querySelector("#report"),
  outputPreview: document.querySelector("#output-preview"),
};

renderTemplatePresetOptions();
els.outputName.value = state.outputName;
els.fallbackGroup.value = FALLBACK_GROUP_DEFAULT;
els.templateUrl.value = DEFAULT_TEMPLATE_URL;
els.templatePreset.value = "mobile-03";

els.templatePreset.addEventListener("change", () => {
  const preset = ACADEMIA_TEMPLATE_PRESETS.find((item) => item.id === els.templatePreset.value);
  if (preset) {
    els.templateUrl.value = preset.url;
    if (!els.outputName.dataset.touched) {
      const platform = preset.group === "Desktop" ? "desktop" : "mobile";
      els.platform.value = platform;
      els.outputName.value = defaultOutputName(platform);
    }
  }
});

els.templateUrl.addEventListener("input", () => {
  const url = els.templateUrl.value.trim();
  const matched = ACADEMIA_TEMPLATE_PRESETS.find((item) => item.url === url);
  els.templatePreset.value = matched ? matched.id : "custom";
});

els.platform.addEventListener("input", () => {
  if (!els.outputName.dataset.touched) {
    els.outputName.value = defaultOutputName(els.platform.value);
  }
});

els.outputName.addEventListener("input", () => {
  els.outputName.dataset.touched = "1";
});

els.generate.addEventListener("click", async () => {
  await generate();
});

els.download.addEventListener("click", () => {
  if (!state.output) {
    setStatus("还没有生成 YAML", "error");
    return;
  }
  downloadText(state.output, normalizeFileName(els.outputName.value));
});

setupDropZone("template-drop", els.templateFile);
setupDropZone("nodes-drop", els.nodesFile);

async function generate() {
  setStatus("正在读取输入...", "pending");
  els.download.disabled = true;
  els.report.innerHTML = "";
  els.outputPreview.value = "";

  try {
    const templateText = await readSource("template", {
      file: els.templateFile.files[0],
      url: els.templateUrl.value,
      text: els.templateText.value,
    });
    const nodesText = await readSource("nodes", {
      file: els.nodesFile.files[0],
      url: els.nodesUrl.value,
      text: els.nodesText.value,
      optional: true,
    });

    const { output, report } = transformClashConfig(templateText, nodesText, {
      fallbackRegion: els.fallbackRegion.value,
      fallbackGroupName: els.fallbackGroup.value.trim() || FALLBACK_GROUP_DEFAULT,
      hideMissing: els.hideMissing.checked,
    });

    state.output = output;
    els.outputPreview.value = output;
    els.download.disabled = false;
    renderReport(report);

    const name = normalizeFileName(els.outputName.value);
    setStatus(`完成：可以下载 ${name}`, "ok");
  } catch (error) {
    state.output = "";
    els.download.disabled = true;
    setStatus(error.message || String(error), "error");
  }
}

async function readSource(label, source) {
  if (source.file) {
    return source.file.text();
  }
  if (source.text && source.text.trim()) {
    return source.text;
  }
  if (source.url && source.url.trim()) {
    return fetchViaWorker(source.url.trim());
  }
  if (source.optional) {
    return "";
  }
  throw new Error(label === "template" ? "请提供模板 YAML" : "请提供节点 YAML");
}

async function fetchViaWorker(url) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new Error(`URL 读取失败：${error.message}。GitHub Pages 版本不会代理远程内容；如果自定义 URL 不允许浏览器跨域读取，请拖入文件或直接粘贴 YAML。`);
  }
  if (!response.ok) {
    throw new Error(`URL 读取失败：HTTP ${response.status}`);
  }
  return response.text();
}

function renderReport(report) {
  const rows = [
    ["输入节点", report.inputNodes],
    ["可用节点", report.usableNodes],
    ["fallback 节点", report.fallbackNodes],
    ["策略组", report.proxyGroups],
    ["隐藏缺失组", report.hiddenGroups],
    ["补 fallback 组", report.fallbackInjectedGroups],
    ["转换 filter 组", report.convertedFilterGroups],
    ["rules 未修改", report.rulesUntouched ? "是" : "否"],
    ["rule-providers 未修改", report.ruleProvidersUntouched ? "是" : "否"],
    ["dns policy 未修改", report.dnsPolicyUntouched ? "是" : "否"],
  ];

  els.report.innerHTML = rows
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`)
    .join("");
}

function renderTemplatePresetOptions() {
  const groups = new Map();
  for (const preset of ACADEMIA_TEMPLATE_PRESETS) {
    if (!groups.has(preset.group)) {
      groups.set(preset.group, []);
    }
    groups.get(preset.group).push(preset);
  }

  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "Custom URL / File / Paste";
  els.templatePreset.appendChild(custom);

  for (const [groupName, presets] of groups) {
    const group = document.createElement("optgroup");
    group.label = groupName;
    for (const preset of presets) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      group.appendChild(option);
    }
    els.templatePreset.appendChild(group);
  }
}

function setupDropZone(id, fileInput) {
  const zone = document.querySelector(`#${id}`);
  zone.addEventListener("click", () => fileInput.click());
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragging");
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragging");
    const file = event.dataTransfer.files[0];
    if (!file) {
      return;
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    zone.querySelector("span").textContent = file.name;
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    zone.querySelector("span").textContent = file ? file.name : "拖入文件或点击选择";
  });
}

function downloadText(text, fileName) {
  const blob = new Blob([text], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeFileName(value) {
  const raw = String(value || "").trim() || defaultOutputName(els.platform.value);
  return raw.endsWith(".yaml") || raw.endsWith(".yml") ? raw : `${raw}.yaml`;
}

function setStatus(message, type) {
  els.status.textContent = message;
  els.status.dataset.type = type;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch];
  });
}
