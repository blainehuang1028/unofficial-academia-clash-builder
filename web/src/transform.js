const FALLBACK_GROUP_DEFAULT = "🧩.<Fallback>--Available.Nodes";
const DEFAULT_TEMPLATE_URL =
  "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Mobile]-WhiteList-03-Non.AntiAD.yaml";
const ACADEMIA_TEMPLATE_PRESETS = [
  {
    id: "mobile-03",
    label: "Mobile WhiteList 03 Non AntiAD",
    group: "Mobile",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Mobile]-WhiteList-03-Non.AntiAD.yaml",
  },
  {
    id: "mobile-02",
    label: "Mobile WhiteList 02 Min AntiAD",
    group: "Mobile",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Mobile]-WhiteList-02-Min.AntiAD.yaml",
  },
  {
    id: "mobile-01",
    label: "Mobile WhiteList 01",
    group: "Mobile",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Mobile]-WhiteList-01.yaml",
  },
  {
    id: "desktop-03",
    label: "Desktop WhiteList 03 Non AntiAD",
    group: "Desktop",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Desktop]-WhiteList-03-Non.AntiAD.yaml",
  },
  {
    id: "desktop-02",
    label: "Desktop WhiteList 02 Min AntiAD",
    group: "Desktop",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Desktop]-WhiteList-02-Min.AntiAD.yaml",
  },
  {
    id: "desktop-01",
    label: "Desktop WhiteList 01",
    group: "Desktop",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Desktop]-WhiteList-01.yaml",
  },
  {
    id: "universal-03",
    label: "Universal WhiteList 03 Non AntiAD",
    group: "Universal",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[通用模版]-WhiteList-03-Non.AntiAD.yaml",
  },
  {
    id: "universal-02",
    label: "Universal WhiteList 02 Min AntiAD",
    group: "Universal",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[通用模版]-WhiteList-02-Min.AntiAD.yaml",
  },
  {
    id: "universal-01",
    label: "Universal WhiteList 01",
    group: "Universal",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[通用模版]-WhiteList-01.yaml",
  },
  {
    id: "blacklist-03",
    label: "BlackList 03 Non AntiAD",
    group: "BlackList",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/BlackList-03-Non.AntiAD.yaml",
  },
  {
    id: "blacklist-02",
    label: "BlackList 02 Min AntiAD",
    group: "BlackList",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/BlackList-02-Min.AntiAD.yaml",
  },
  {
    id: "blacklist-01",
    label: "BlackList 01",
    group: "BlackList",
    url: "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/BlackList-01.yaml",
  },
];

const REGION_PATTERNS = [
  ["US", ["🇺🇸", "USA", "UNITED STATES", "美国", "美國"]],
  ["JP", ["🇯🇵", "JAPAN", "日本"]],
  ["UK", ["🇬🇧", "GB", "UNITED KINGDOM", "英国", "英國"]],
  ["AU", ["🇦🇺", "AUSTRALIA", "澳洲", "澳大利亚", "澳大利亞"]],
  ["HK", ["🇭🇰", "HONG KONG", "香港"]],
  ["TW", ["🇹🇼", "TAIWAN", "台湾", "台灣"]],
  ["SG", ["🇸🇬", "SINGAPORE", "新加坡", "狮城", "獅城"]],
  ["KR", ["🇰🇷", "KOREA", "韩国", "韓國"]],
  ["CA", ["🇨🇦", "CANADA", "加拿大"]],
  ["DE", ["🇩🇪", "GERMANY", "德国", "德國"]],
  ["FR", ["🇫🇷", "FRANCE", "法国", "法國"]],
  ["NL", ["🇳🇱", "NETHERLANDS", "荷兰", "荷蘭"]],
];

const ROLE_PATTERNS = [
  ["HOMEIP", ["HOMEIP", "HOME IP", "RESIDENTIAL", "住宅", "家宽", "家寬"]],
  ["SHOWIP", ["SHOWIP", "SHOW IP", "SHOW GEO", "归属地", "歸屬地", "落地"]],
  ["RELAY", ["RELAY", "REALY", "TRANSIT", "中转", "中轉", "中继", "中繼", "转发", "轉發"]],
  ["CHAIN", ["PRXCHAIN", "PROXYCHAIN", "PROXY CHAIN", "代理链", "代理鏈"]],
];

const BUILTINS = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "GLOBAL"]);

export function transformClashConfig(templateText, nodesText, options = {}) {
  const yaml = options.yaml || globalThis.jsyaml;
  if (!yaml) {
    throw new Error("缺少 js-yaml");
  }

  const template = yaml.load(templateText);
  if (!isObject(template)) {
    throw new Error("模板 YAML 根节点必须是对象");
  }

  const nodesRoot = nodesText && nodesText.trim() ? yaml.load(nodesText) : clone(template);
  const rulesBefore = clone(template.rules);
  const providersBefore = clone(template["rule-providers"]);
  const dnsPolicyBefore = clone(template.dns && template.dns["nameserver-policy"]);

  const sourceNodes = extractProxies(nodesRoot);
  const usableNodes = sourceNodes.filter(isUsableProxy);
  if (usableNodes.length === 0) {
    throw new Error("没有找到可用节点。节点 YAML 需要包含 proxies 数组，或本身就是节点数组。");
  }

  const nodeInfos = usableNodes
    .map((proxy) => {
      const name = String(proxy.name || "");
      return name ? { name, labels: labelsFor(name) } : null;
    })
    .filter(Boolean);
  const nodeNames = new Set(nodeInfos.map((node) => node.name));

  const fallbackGroupName = options.fallbackGroupName || FALLBACK_GROUP_DEFAULT;
  const fallbackRegion = normalizeRegion(options.fallbackRegion);
  const hideMissing = options.hideMissing !== false;
  const fallbackNodes = selectFallbackNodes(nodeInfos, fallbackRegion);
  const fallbackNames = fallbackNodes.map((node) => node.name);

  template.proxies = usableNodes;

  const report = {
    inputNodes: sourceNodes.length,
    usableNodes: usableNodes.length,
    fallbackNodes: fallbackNames.length,
    proxyGroups: 0,
    hiddenGroups: 0,
    fallbackInjectedGroups: 0,
    convertedFilterGroups: 0,
    rules: Array.isArray(template.rules) ? template.rules.length : 0,
    ruleProviders: isObject(template["rule-providers"]) ? Object.keys(template["rule-providers"]).length : 0,
    rulesUntouched: true,
    ruleProvidersUntouched: true,
    dnsPolicyUntouched: true,
  };

  transformGroups(template, nodeInfos, nodeNames, fallbackNames, {
    fallbackGroupName,
    hideMissing,
    report,
  });

  report.rulesUntouched = sameValue(template.rules, rulesBefore);
  report.ruleProvidersUntouched = sameValue(template["rule-providers"], providersBefore);
  report.dnsPolicyUntouched = sameValue(template.dns && template.dns["nameserver-policy"], dnsPolicyBefore);

  const output =
    "# Generated by Unofficial Accademia Clash Builder. rules/rule-providers/dns.nameserver-policy are preserved.\n" +
    yaml.dump(template, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      condenseFlow: false,
    });

  return { output, report };
}

export function defaultOutputName(platform = "mobile", now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const safePlatform = String(platform || "mobile")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safePlatform || "mobile"}-${yyyy}${mm}${dd}.yaml`;
}

function transformGroups(template, nodeInfos, nodeNames, fallbackNames, context) {
  if (!Array.isArray(template["proxy-groups"])) {
    throw new Error("模板 YAML 缺少 proxy-groups 数组");
  }

  const groups = template["proxy-groups"]
    .filter((group) => !isObject(group) || group.name !== context.fallbackGroupName);
  groups.unshift({
    name: context.fallbackGroupName,
    type: "select",
    hidden: false,
    proxies: fallbackNames,
  });
  template["proxy-groups"] = groups;

  const groupNames = new Set(groups.filter(isObject).map((group) => String(group.name || "")));
  context.report.proxyGroups = groups.length;

  for (const group of groups) {
    if (!isObject(group) || group.name === context.fallbackGroupName) {
      continue;
    }

    const labels = labelsFor(String(group.name || ""));
    const filter = typeof group.filter === "string" ? group.filter : null;
    const excludeFilter = typeof group["exclude-filter"] === "string" ? group["exclude-filter"] : null;
    const hadDynamicFilter =
      filter !== null ||
      Object.prototype.hasOwnProperty.call(group, "include-all") ||
      Object.prototype.hasOwnProperty.call(group, "use");

    let matchedNodes = filter
      ? matchNodesByFilter(nodeInfos, filter, excludeFilter)
      : matchNodesByLabels(nodeInfos, labels);

    if (filter) {
      context.report.convertedFilterGroups += 1;
    }

    const hasSpecificNodeInfo = labels.regions.size > 0 || labels.roles.size > 0;
    if (matchedNodes.length === 0 && !hasSpecificNodeInfo && hadDynamicFilter) {
      matchedNodes = fallbackNames.slice();
    }

    if (hadDynamicFilter) {
      removeDynamicGroupKeys(group);
      if (matchedNodes.length === 0) {
        injectFallback(group, context);
      } else {
        setGroupProxies(group, matchedNodes);
      }
      continue;
    }

    const cleaned = cleanExistingProxies(group, nodeNames, groupNames);
    if (hasSpecificNodeInfo) {
      if (matchedNodes.length === 0) {
        injectFallback(group, context);
      } else if (cleaned.length === 0 || onlyBuiltins(cleaned)) {
        setGroupProxies(group, matchedNodes);
      } else {
        setGroupProxies(group, cleaned);
      }
    } else if (cleaned.length === 0) {
      setGroupProxies(group, [context.fallbackGroupName]);
      context.report.fallbackInjectedGroups += 1;
    } else {
      setGroupProxies(group, cleaned);
    }
  }
}

function extractProxies(root) {
  if (isObject(root) && Array.isArray(root.proxies)) {
    return root.proxies.slice();
  }
  if (Array.isArray(root)) {
    return root.slice();
  }
  return [];
}

function isUsableProxy(proxy) {
  if (!isObject(proxy)) {
    return false;
  }
  const name = String(proxy.name || "").trim();
  const server = String(proxy.server || "").trim();
  if (!name || !server) {
    return false;
  }
  if (["0.0.0.0", "127.0.0.1", "localhost", "example.com"].includes(server)) {
    return false;
  }
  const port = proxy.port;
  if (port === 0 || port === "0" || port === "00000") {
    return false;
  }
  return true;
}

function selectFallbackNodes(nodes, region) {
  if (region) {
    const selected = nodes.filter((node) => node.labels.regions.has(region));
    if (selected.length > 0) {
      return selected;
    }
  }
  return nodes.slice();
}

function matchNodesByFilter(nodes, filter, excludeFilter) {
  const filterRe = safeRegex(filter);
  const excludeRe = safeRegex(excludeFilter);
  return nodes
    .filter((node) => {
      const include = filterRe ? filterRe.test(node.name) : fallbackTextMatch(node.name, filter);
      const exclude = excludeRe ? excludeRe.test(node.name) : false;
      return include && !exclude;
    })
    .map((node) => node.name);
}

function matchNodesByLabels(nodes, labels) {
  if (labels.regions.size === 0 && labels.roles.size === 0) {
    return [];
  }
  return nodes
    .filter((node) => {
      const regionOk = labels.regions.size === 0 || intersects(labels.regions, node.labels.regions);
      const roleOk = labels.roles.size === 0 || intersects(labels.roles, node.labels.roles);
      return regionOk && roleOk;
    })
    .map((node) => node.name);
}

function cleanExistingProxies(group, nodeNames, groupNames) {
  const out = [];
  const seen = new Set();
  if (!Array.isArray(group.proxies)) {
    return out;
  }
  for (const item of group.proxies) {
    if (typeof item !== "string") {
      continue;
    }
    if (BUILTINS.has(item) || nodeNames.has(item) || groupNames.has(item)) {
      pushUnique(out, seen, item);
    }
  }
  return out;
}

function onlyBuiltins(names) {
  return names.length > 0 && names.every((name) => BUILTINS.has(name));
}

function injectFallback(group, context) {
  setGroupProxies(group, [context.fallbackGroupName]);
  if (context.hideMissing && group.hidden !== true) {
    group.hidden = true;
    context.report.hiddenGroups += 1;
  } else if (context.hideMissing) {
    group.hidden = true;
  }
  context.report.fallbackInjectedGroups += 1;
}

function setGroupProxies(group, proxies) {
  const seen = new Set();
  group.proxies = proxies.filter((name) => {
    const value = String(name);
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function removeDynamicGroupKeys(group) {
  delete group["include-all"];
  delete group.filter;
  delete group["exclude-filter"];
  delete group.use;
}

function labelsFor(text) {
  const labels = { regions: new Set(), roles: new Set() };
  for (const [code, words] of REGION_PATTERNS) {
    if (containsAnyLabel(text, code, words)) {
      labels.regions.add(code);
    }
  }
  for (const [role, words] of ROLE_PATTERNS) {
    if (containsAnyLabel(text, role, words)) {
      labels.roles.add(role);
    }
  }
  return labels;
}

function containsAnyLabel(text, codeOrRole, words) {
  const upper = String(text || "").toUpperCase();
  if (words.some((word) => upper.includes(word.toUpperCase()))) {
    return true;
  }
  const tokens = new Set(upper.split(/[^A-Z0-9]+/).filter(Boolean));
  return tokens.has(codeOrRole);
}

function fallbackTextMatch(name, filter) {
  const lowerName = String(name).toLowerCase();
  return String(filter || "")
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part.length >= 2)
    .some((part) => lowerName.includes(part.toLowerCase()));
}

function safeRegex(pattern) {
  if (!pattern) {
    return null;
  }
  const normalized = String(pattern);
  const ignoreCase = normalized.includes("(?i)");
  const source = normalized.replace(/\(\?i\)/g, "");
  try {
    return new RegExp(source, ignoreCase ? "i" : "");
  } catch {
    return null;
  }
}

function normalizeRegion(region) {
  const value = String(region || "").trim().toUpperCase();
  if (!value || value === "AUTO" || value === "ALL") {
    return null;
  }
  return value;
}

function intersects(a, b) {
  for (const item of a) {
    if (b.has(item)) {
      return true;
    }
  }
  return false;
}

function pushUnique(out, seen, item) {
  if (!seen.has(item)) {
    seen.add(item);
    out.push(item);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function sameValue(a, b) {
  return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
}

export { ACADEMIA_TEMPLATE_PRESETS, DEFAULT_TEMPLATE_URL, FALLBACK_GROUP_DEFAULT };
