use regex::Regex;
use serde_json::json;
use serde_yaml::{Mapping, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::env;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

const FALLBACK_GROUP_DEFAULT: &str = "🧩.<Fallback>--Available.Nodes";
const DEFAULT_TEMPLATE_URL: &str =
    "https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Mobile]-WhiteList-03-Non.AntiAD.yaml";
const APP_NAME: &str = "unofficial-academia-clash-builder";

#[derive(Debug, Clone)]
struct Config {
    template: String,
    nodes: Option<String>,
    output: PathBuf,
    fallback_region: Option<String>,
    fallback_group_name: String,
    hide_missing: bool,
    report_json: bool,
}

#[derive(Debug, Clone, Default)]
struct Labels {
    regions: BTreeSet<String>,
    roles: BTreeSet<String>,
}

#[derive(Debug, Clone)]
struct NodeInfo {
    name: String,
    labels: Labels,
}

#[derive(Debug, Clone)]
struct Report {
    input_nodes: usize,
    usable_nodes: usize,
    fallback_nodes: usize,
    proxy_groups: usize,
    hidden_groups: usize,
    fallback_injected_groups: usize,
    converted_filter_groups: usize,
    rules: usize,
    rule_providers: usize,
    dns_policy_untouched: bool,
    rules_untouched: bool,
    rule_providers_untouched: bool,
}

fn main() {
    if let Err(err) = run() {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let config = parse_args()?;
    let template_text = read_source(&config.template)?;
    let nodes_text = match &config.nodes {
        Some(source) => Some(read_source(source)?),
        None => None,
    };

    let (output, report) = transform(&template_text, nodes_text.as_deref(), &config)?;
    if let Some(parent) = config.output.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&config.output, output)?;

    if config.report_json {
        println!(
            "{}",
            serde_json::to_string_pretty(&json!({
                "input_nodes": report.input_nodes,
                "usable_nodes": report.usable_nodes,
                "fallback_nodes": report.fallback_nodes,
                "proxy_groups": report.proxy_groups,
                "hidden_groups": report.hidden_groups,
                "fallback_injected_groups": report.fallback_injected_groups,
                "converted_filter_groups": report.converted_filter_groups,
                "rules": report.rules,
                "rule_providers": report.rule_providers,
                "dns_policy_untouched": report.dns_policy_untouched,
                "rules_untouched": report.rules_untouched,
                "rule_providers_untouched": report.rule_providers_untouched,
                "output": config.output,
            }))?
        );
    } else {
        println!("完成：{}", config.output.display());
        println!(
            "节点：输入 {} 个，可用 {} 个，fallback {} 个",
            report.input_nodes, report.usable_nodes, report.fallback_nodes
        );
        println!(
            "策略组：共 {} 个，隐藏 {} 个，补 fallback {} 个，转换 filter {} 个",
            report.proxy_groups,
            report.hidden_groups,
            report.fallback_injected_groups,
            report.converted_filter_groups
        );
        println!(
            "未修改：rules={}，rule-providers={}，dns.nameserver-policy={}",
            report.rules_untouched, report.rule_providers_untouched, report.dns_policy_untouched
        );
    }
    Ok(())
}

fn parse_args() -> Result<Config, Box<dyn Error>> {
    let mut template = None;
    let mut nodes = None;
    let mut output = None;
    let mut fallback_region = None;
    let mut fallback_group_name = FALLBACK_GROUP_DEFAULT.to_string();
    let mut hide_missing = true;
    let mut report_json = false;

    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "-t" | "--template" => template = Some(next_arg(&mut args, "--template")?),
            "-n" | "--nodes" => nodes = Some(next_arg(&mut args, "--nodes")?),
            "-o" | "--output" => output = Some(PathBuf::from(next_arg(&mut args, "--output")?)),
            "--fallback-region" => {
                let value = next_arg(&mut args, "--fallback-region")?;
                fallback_region =
                    if value.eq_ignore_ascii_case("auto") || value.eq_ignore_ascii_case("all") {
                        None
                    } else {
                        Some(value.to_ascii_uppercase())
                    };
            }
            "--fallback-group" => fallback_group_name = next_arg(&mut args, "--fallback-group")?,
            "--no-hide-missing" => hide_missing = false,
            "--report-json" => report_json = true,
            "-h" | "--help" => {
                print_help();
                std::process::exit(0);
            }
            other => return Err(format!("unknown argument: {other}").into()),
        }
    }

    Ok(Config {
        template: template.unwrap_or_else(|| DEFAULT_TEMPLATE_URL.to_string()),
        nodes,
        output: output.unwrap_or_else(|| PathBuf::from("clash-output.yaml")),
        fallback_region,
        fallback_group_name,
        hide_missing,
        report_json,
    })
}

fn next_arg(args: &mut impl Iterator<Item = String>, name: &str) -> Result<String, Box<dyn Error>> {
    args.next()
        .ok_or_else(|| format!("missing value for {name}").into())
}

fn print_help() {
    println!(
        "{APP_NAME}\n\n只处理 Clash/mihomo YAML：注入节点、隐藏缺失节点信息的策略组、避免空组 COMPATIBLE。\n\n默认模板：\n  {DEFAULT_TEMPLATE_URL}\n\n用法：\n  {APP_NAME} --nodes nodes.yaml --output output.yaml\n  {APP_NAME} --template template.yaml --nodes nodes.yaml --output output.yaml\n  {APP_NAME} --template https://example.com/template.yaml --nodes ./nodes.yaml --fallback-region US\n\n选项：\n  -t, --template          模板 YAML 文件路径或 URL；不填则使用默认 Academia Mobile 模板。\n  -n, --nodes             节点 YAML 文件路径或 URL；不填则使用模板自身 proxies。\n  -o, --output            输出 YAML。默认 clash-output.yaml。\n      --fallback-region   fallback 节点地区，例如 US；auto/all 表示所有可用节点。默认 auto。\n      --fallback-group    fallback 策略组名称。默认 {FALLBACK_GROUP_DEFAULT}。\n      --no-hide-missing   缺失节点信息的组不设置 hidden: true，只补 fallback。\n      --report-json       输出 JSON 报告。\n  -h, --help              显示帮助。\n\n底线：不修改 rules、rule-providers、dns.nameserver-policy。"
    );
}

fn read_source(source: &str) -> Result<String, Box<dyn Error>> {
    if source.starts_with("http://") || source.starts_with("https://") {
        let response = ureq::get(source)
            .set("User-Agent", "unofficial-academia-clash-builder/0.1")
            .call()?;
        return Ok(response.into_string()?);
    }
    Ok(fs::read_to_string(expand_tilde(source))?)
}

fn expand_tilde(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = env::var("HOME") {
            return Path::new(&home).join(rest);
        }
    }
    PathBuf::from(path)
}

fn transform(
    template_text: &str,
    nodes_text: Option<&str>,
    config: &Config,
) -> Result<(String, Report), Box<dyn Error>> {
    let mut template: Value = serde_yaml::from_str(template_text)?;
    let nodes_value: Value = match nodes_text {
        Some(text) => serde_yaml::from_str(text)?,
        None => template.clone(),
    };

    let rules_before = get_key(&template, "rules").cloned();
    let providers_before = get_key(&template, "rule-providers").cloned();
    let dns_policy_before = get_nested(&template, &["dns", "nameserver-policy"]).cloned();

    let source_nodes = extract_proxies(&nodes_value);
    let input_nodes = source_nodes.len();
    let usable_nodes = source_nodes
        .into_iter()
        .filter(is_usable_proxy)
        .collect::<Vec<_>>();
    if usable_nodes.is_empty() {
        return Err("no usable nodes found in --nodes or template proxies".into());
    }

    let node_infos = usable_nodes
        .iter()
        .filter_map(|node| {
            let name = proxy_name(node)?;
            Some(NodeInfo {
                labels: labels_for(&name),
                name,
            })
        })
        .collect::<Vec<_>>();
    let node_names = node_infos
        .iter()
        .map(|node| node.name.clone())
        .collect::<BTreeSet<_>>();

    let fallback_nodes = select_fallback_nodes(&node_infos, config.fallback_region.as_deref());
    let fallback_names = fallback_nodes
        .iter()
        .map(|node| node.name.clone())
        .collect::<Vec<_>>();

    let proxy_providers = get_key(&template, "proxy-providers").cloned();
    set_root_key(
        &mut template,
        "proxies",
        Value::Sequence(usable_nodes.clone()),
    )?;
    if let Some(proxy_providers) = proxy_providers {
        set_root_key(&mut template, "proxy-providers", proxy_providers)?;
    }

    let mut report = Report {
        input_nodes,
        usable_nodes: usable_nodes.len(),
        fallback_nodes: fallback_names.len(),
        proxy_groups: 0,
        hidden_groups: 0,
        fallback_injected_groups: 0,
        converted_filter_groups: 0,
        rules: seq_len(get_key(&template, "rules")),
        rule_providers: map_len(get_key(&template, "rule-providers")),
        dns_policy_untouched: true,
        rules_untouched: true,
        rule_providers_untouched: true,
    };

    transform_groups(
        &mut template,
        &node_infos,
        &node_names,
        &fallback_names,
        config,
        &mut report,
    )?;

    report.rules_untouched = get_key(&template, "rules").cloned() == rules_before;
    report.rule_providers_untouched =
        get_key(&template, "rule-providers").cloned() == providers_before;
    report.dns_policy_untouched =
        get_nested(&template, &["dns", "nameserver-policy"]).cloned() == dns_policy_before;

    let mut output = serde_yaml::to_string(&template)?;
    output.insert_str(
        0,
        "# Generated by Unofficial Accademia Clash Builder. rules/rule-providers/dns.nameserver-policy are preserved.\n",
    );
    Ok((output, report))
}

fn transform_groups(
    template: &mut Value,
    node_infos: &[NodeInfo],
    node_names: &BTreeSet<String>,
    fallback_names: &[String],
    config: &Config,
    report: &mut Report,
) -> Result<(), Box<dyn Error>> {
    let fallback_group = fallback_group_value(&config.fallback_group_name, fallback_names);
    let groups = get_key_mut(template, "proxy-groups")
        .and_then(Value::as_sequence_mut)
        .ok_or("template has no proxy-groups sequence")?;

    groups.retain(|group| {
        group_name(group)
            .map(|name| name != config.fallback_group_name)
            .unwrap_or(true)
    });
    groups.insert(0, fallback_group);

    let group_names = groups
        .iter()
        .filter_map(group_name)
        .collect::<BTreeSet<_>>();
    report.proxy_groups = groups.len();

    for group in groups.iter_mut() {
        let Some(map) = group.as_mapping_mut() else {
            continue;
        };
        let name = map
            .get(string_key("name"))
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        if name == config.fallback_group_name {
            continue;
        }

        let labels = labels_for(&name);
        let filter = map
            .get(string_key("filter"))
            .and_then(Value::as_str)
            .map(str::to_string);
        let exclude_filter = map
            .get(string_key("exclude-filter"))
            .and_then(Value::as_str)
            .map(str::to_string);
        let had_dynamic_filter = filter.is_some()
            || map.get(string_key("include-all")).is_some()
            || map.get(string_key("use")).is_some();

        let mut matched_nodes = if let Some(filter) = filter {
            let exclude = exclude_filter.as_deref();
            let matched = match_nodes_by_filter(node_infos, &filter, exclude);
            report.converted_filter_groups += 1;
            matched
        } else {
            match_nodes_by_labels(node_infos, &labels)
        };

        let has_specific_node_info = !labels.regions.is_empty() || !labels.roles.is_empty();
        if matched_nodes.is_empty() && !has_specific_node_info && had_dynamic_filter {
            matched_nodes = fallback_names.to_vec();
        }

        if had_dynamic_filter {
            remove_dynamic_group_keys(map);
            if matched_nodes.is_empty() {
                inject_fallback(map, &config.fallback_group_name);
                mark_hidden(map, config.hide_missing, report);
                report.fallback_injected_groups += 1;
            } else {
                set_group_proxies(map, &matched_nodes);
            }
            continue;
        }

        let cleaned = clean_existing_proxies(map, node_names, &group_names);
        if has_specific_node_info {
            if matched_nodes.is_empty() {
                inject_fallback(map, &config.fallback_group_name);
                mark_hidden(map, config.hide_missing, report);
                report.fallback_injected_groups += 1;
            } else if cleaned.is_empty() || only_builtins(&cleaned) {
                set_group_proxies(map, &matched_nodes);
            } else {
                set_group_proxies(map, &cleaned);
            }
        } else if cleaned.is_empty() {
            inject_fallback(map, &config.fallback_group_name);
            report.fallback_injected_groups += 1;
        } else {
            set_group_proxies(map, &cleaned);
        }
    }
    Ok(())
}

fn extract_proxies(root: &Value) -> Vec<Value> {
    if let Some(seq) = get_key(root, "proxies").and_then(Value::as_sequence) {
        return seq.clone();
    }
    if let Some(seq) = root.as_sequence() {
        return seq.clone();
    }
    Vec::new()
}

fn is_usable_proxy(proxy: &Value) -> bool {
    let Some(map) = proxy.as_mapping() else {
        return false;
    };
    let name = map
        .get(string_key("name"))
        .and_then(Value::as_str)
        .unwrap_or("");
    let server = map
        .get(string_key("server"))
        .and_then(Value::as_str)
        .unwrap_or("");
    let port = map.get(string_key("port"));
    if name.trim().is_empty() || server.trim().is_empty() {
        return false;
    }
    if matches!(
        server,
        "0.0.0.0" | "127.0.0.1" | "localhost" | "example.com"
    ) {
        return false;
    }
    if let Some(port) = port {
        if port.as_i64() == Some(0) || port.as_str() == Some("0") || port.as_str() == Some("00000")
        {
            return false;
        }
    }
    true
}

fn proxy_name(proxy: &Value) -> Option<String> {
    proxy
        .as_mapping()?
        .get(string_key("name"))?
        .as_str()
        .map(str::to_string)
}

fn group_name(group: &Value) -> Option<String> {
    group
        .as_mapping()?
        .get(string_key("name"))?
        .as_str()
        .map(str::to_string)
}

fn fallback_group_value(name: &str, fallback_names: &[String]) -> Value {
    let mut map = Mapping::new();
    map.insert(string_value("name"), string_value(name));
    map.insert(string_value("type"), string_value("select"));
    map.insert(string_value("hidden"), Value::Bool(false));
    map.insert(
        string_value("proxies"),
        Value::Sequence(
            fallback_names
                .iter()
                .map(|name| string_value(name))
                .collect(),
        ),
    );
    Value::Mapping(map)
}

fn select_fallback_nodes<'a>(nodes: &'a [NodeInfo], region: Option<&str>) -> Vec<&'a NodeInfo> {
    if let Some(region) = region {
        let selected = nodes
            .iter()
            .filter(|node| node.labels.regions.contains(region))
            .collect::<Vec<_>>();
        if !selected.is_empty() {
            return selected;
        }
    }
    nodes.iter().collect()
}

fn match_nodes_by_filter(nodes: &[NodeInfo], filter: &str, exclude: Option<&str>) -> Vec<String> {
    let filter_re = Regex::new(filter).ok();
    let exclude_re = exclude.and_then(|value| Regex::new(value).ok());
    nodes
        .iter()
        .filter(|node| {
            let include = filter_re
                .as_ref()
                .map(|re| re.is_match(&node.name))
                .unwrap_or_else(|| fallback_text_match(&node.name, filter));
            let exclude = exclude_re
                .as_ref()
                .map(|re| re.is_match(&node.name))
                .unwrap_or(false);
            include && !exclude
        })
        .map(|node| node.name.clone())
        .collect()
}

fn fallback_text_match(name: &str, filter: &str) -> bool {
    let name = name.to_ascii_lowercase();
    filter
        .split(|ch: char| !ch.is_alphanumeric())
        .filter(|part| part.len() >= 2)
        .any(|part| name.contains(&part.to_ascii_lowercase()))
}

fn match_nodes_by_labels(nodes: &[NodeInfo], labels: &Labels) -> Vec<String> {
    if labels.regions.is_empty() && labels.roles.is_empty() {
        return Vec::new();
    }
    nodes
        .iter()
        .filter(|node| {
            (labels.regions.is_empty() || intersects(&labels.regions, &node.labels.regions))
                && (labels.roles.is_empty() || intersects(&labels.roles, &node.labels.roles))
        })
        .map(|node| node.name.clone())
        .collect()
}

fn intersects(a: &BTreeSet<String>, b: &BTreeSet<String>) -> bool {
    a.iter().any(|item| b.contains(item))
}

fn clean_existing_proxies(
    map: &Mapping,
    node_names: &BTreeSet<String>,
    group_names: &BTreeSet<String>,
) -> Vec<String> {
    let mut out = Vec::new();
    let mut seen = BTreeSet::new();
    let Some(proxies) = map.get(string_key("proxies")).and_then(Value::as_sequence) else {
        return out;
    };
    for proxy in proxies {
        let Some(name) = proxy.as_str() else {
            continue;
        };
        if is_builtin(name) || node_names.contains(name) || group_names.contains(name) {
            push_unique(&mut out, &mut seen, name);
        }
    }
    out
}

fn only_builtins(proxies: &[String]) -> bool {
    !proxies.is_empty() && proxies.iter().all(|name| is_builtin(name))
}

fn inject_fallback(map: &mut Mapping, fallback_group_name: &str) {
    set_group_proxies(map, &[fallback_group_name.to_string()]);
}

fn set_group_proxies(map: &mut Mapping, proxies: &[String]) {
    let mut seen = BTreeSet::new();
    let values = proxies
        .iter()
        .filter(|name| seen.insert((*name).clone()))
        .map(|name| string_value(name))
        .collect::<Vec<_>>();
    map.insert(string_value("proxies"), Value::Sequence(values));
}

fn mark_hidden(map: &mut Mapping, hide_missing: bool, report: &mut Report) {
    if hide_missing {
        let already_hidden = map
            .get(string_key("hidden"))
            .and_then(Value::as_bool)
            .unwrap_or(false);
        map.insert(string_value("hidden"), Value::Bool(true));
        if !already_hidden {
            report.hidden_groups += 1;
        }
    }
}

fn remove_dynamic_group_keys(map: &mut Mapping) {
    for key in ["include-all", "filter", "exclude-filter", "use"] {
        map.remove(string_key(key));
    }
}

fn labels_for(text: &str) -> Labels {
    let mut labels = Labels::default();
    for (code, words) in region_patterns() {
        if contains_any_label(text, &code, &words) {
            labels.regions.insert(code);
        }
    }
    for (role, words) in role_patterns() {
        if contains_any_label(text, &role, &words) {
            labels.roles.insert(role);
        }
    }
    labels
}

fn region_patterns() -> Vec<(String, Vec<String>)> {
    vec![
        ("US", vec!["🇺🇸", "USA", "UNITED STATES", "美国", "美國"]),
        ("JP", vec!["🇯🇵", "JAPAN", "日本"]),
        ("UK", vec!["🇬🇧", "GB", "UNITED KINGDOM", "英国", "英國"]),
        (
            "AU",
            vec!["🇦🇺", "AUSTRALIA", "澳洲", "澳大利亚", "澳大利亞"],
        ),
        ("HK", vec!["🇭🇰", "HONG KONG", "香港"]),
        ("TW", vec!["🇹🇼", "TAIWAN", "台湾", "台灣"]),
        ("SG", vec!["🇸🇬", "SINGAPORE", "新加坡", "狮城", "獅城"]),
        ("KR", vec!["🇰🇷", "KOREA", "韩国", "韓國"]),
        ("CA", vec!["🇨🇦", "CANADA", "加拿大"]),
        ("DE", vec!["🇩🇪", "GERMANY", "德国", "德國"]),
        ("FR", vec!["🇫🇷", "FRANCE", "法国", "法國"]),
        ("NL", vec!["🇳🇱", "NETHERLANDS", "荷兰", "荷蘭"]),
    ]
    .into_iter()
    .map(|(code, words)| {
        (
            code.to_string(),
            words.into_iter().map(str::to_string).collect(),
        )
    })
    .collect()
}

fn role_patterns() -> Vec<(String, Vec<String>)> {
    vec![
        (
            "HOMEIP",
            vec!["HOMEIP", "HOME IP", "RESIDENTIAL", "住宅", "家宽", "家寬"],
        ),
        (
            "SHOWIP",
            vec!["SHOWIP", "SHOW IP", "SHOW GEO", "归属地", "歸屬地", "落地"],
        ),
        (
            "RELAY",
            vec![
                "RELAY", "REALY", "TRANSIT", "中转", "中轉", "中继", "中繼", "转发", "轉發",
            ],
        ),
        (
            "CHAIN",
            vec!["PRXCHAIN", "PROXYCHAIN", "PROXY CHAIN", "代理链", "代理鏈"],
        ),
    ]
    .into_iter()
    .map(|(role, words)| {
        (
            role.to_string(),
            words.into_iter().map(str::to_string).collect(),
        )
    })
    .collect()
}

fn contains_any_label(text: &str, code_or_role: &str, words: &[String]) -> bool {
    let upper = text.to_ascii_uppercase();
    if words
        .iter()
        .any(|word| upper.contains(&word.to_ascii_uppercase()))
    {
        return true;
    }
    let tokens = upper
        .split(|ch: char| !ch.is_ascii_alphanumeric())
        .filter(|part| !part.is_empty())
        .collect::<BTreeSet<_>>();
    tokens.contains(code_or_role)
}

fn is_builtin(name: &str) -> bool {
    matches!(
        name,
        "DIRECT" | "REJECT" | "REJECT-DROP" | "PASS" | "GLOBAL"
    )
}

fn push_unique(out: &mut Vec<String>, seen: &mut BTreeSet<String>, name: &str) {
    if seen.insert(name.to_string()) {
        out.push(name.to_string());
    }
}

fn set_root_key(data: &mut Value, key: &str, value: Value) -> Result<(), Box<dyn Error>> {
    let map = data.as_mapping_mut().ok_or("root yaml is not a mapping")?;
    map.insert(string_value(key), value);
    Ok(())
}

fn get_key<'a>(data: &'a Value, key: &str) -> Option<&'a Value> {
    data.as_mapping()?.get(string_key(key))
}

fn get_key_mut<'a>(data: &'a mut Value, key: &str) -> Option<&'a mut Value> {
    data.as_mapping_mut()?.get_mut(string_key(key))
}

fn get_nested<'a>(data: &'a Value, keys: &[&str]) -> Option<&'a Value> {
    let mut current = data;
    for key in keys {
        current = get_key(current, key)?;
    }
    Some(current)
}

fn map_len(value: Option<&Value>) -> usize {
    value
        .and_then(Value::as_mapping)
        .map(Mapping::len)
        .unwrap_or(0)
}

fn seq_len(value: Option<&Value>) -> usize {
    value
        .and_then(Value::as_sequence)
        .map(Vec::len)
        .unwrap_or(0)
}

fn string_value(value: &str) -> Value {
    Value::String(value.to_string())
}

fn string_key(value: &str) -> &Value {
    Box::leak(Box::new(Value::String(value.to_string())))
}

#[allow(dead_code)]
fn labels_to_json(labels: &Labels) -> BTreeMap<&str, Vec<String>> {
    BTreeMap::from([
        ("regions", labels.regions.iter().cloned().collect()),
        ("roles", labels.roles.iter().cloned().collect()),
    ])
}
