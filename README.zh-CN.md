# Unofficial Accademia Clash Builder

这是一个基于 [Accademia/Clash_Configuration_Template](https://github.com/Accademia/Clash_Configuration_Template) 的非官方 Clash/mihomo YAML 生成工具。

本项目不隶属于 Accademia，也不代表原作者。Accademia 是上游模板和指南的作者，本项目只是围绕这些模板做一个节点注入和策略组整理工具。

## 在线页面

GitHub Pages:

```text
https://blainehuang1028.github.io/unofficial-academia-clash-builder/
```

## 功能

- 使用内置 Accademia 模板预设，或使用自定义 URL、文件、粘贴 YAML。
- 导入 Clash/mihomo 节点 YAML。
- 把可用节点注入到 `proxies`。
- 把模板中的筛选策略组转换成明确的 `proxies` 列表。
- 如果某个地区或类型没有对应节点，会补 fallback 策略组，并设置 `hidden: true`。
- 保持 `rules`、`rule-providers`、`dns.nameserver-policy` 不变。
- 避免部分 Clash/mihomo 客户端因为空策略组生成 `COMPATIBLE`。

## 内置模板

网页内置 12 个 Accademia 模板预设：

- Mobile：`01`、`02-Min.AntiAD`、`03-Non.AntiAD`
- Desktop：`01`、`02-Min.AntiAD`、`03-Non.AntiAD`
- Universal 通用：`01`、`02-Min.AntiAD`、`03-Non.AntiAD`
- BlackList：`01`、`02-Min.AntiAD`、`03-Non.AntiAD`

默认模板：

```text
https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Mobile]-WhiteList-03-Non.AntiAD.yaml
```

## 隐私说明

GitHub Pages 版本是静态网页，YAML 处理在浏览器本地完成。本项目没有后端服务，不保存上传文件、粘贴内容、生成配置、节点名称、服务器地址或订阅 URL。

如果你通过 URL 读取模板或节点列表，浏览器会直接请求该 URL。自定义 URL 必须允许浏览器跨域读取；如果不支持，请使用文件拖入或手动粘贴。

详见 [PRIVACY.md](./PRIVACY.md)。

## 下载后直接运行

如果你下载 Release 包，不需要安装 Rust，也不需要二次编译。

1. 打开最新 Release：

   ```text
   https://github.com/blainehuang1028/unofficial-academia-clash-builder/releases/latest
   ```

2. 下载对应系统的包：

   - macOS Apple Silicon：`unofficial-academia-clash-builder-macos-arm64.tar.gz`
   - Linux x64：`unofficial-academia-clash-builder-linux-x64.tar.gz`
   - Windows x64：`unofficial-academia-clash-builder-windows-x64.zip`

3. 解压后运行里面自带的脚本：

   macOS / Linux：

   ```bash
   ./run.sh --nodes ./nodes.yaml --output ./mobile.yaml --fallback-region US
   ```

   Windows PowerShell：

   ```powershell
   .\run.ps1 --nodes .\nodes.yaml --output .\mobile.yaml --fallback-region US
   ```

每个包里都会包含已编译好的可执行文件、运行脚本、中英文 README、Release notes、许可证、鸣谢、免责声明、隐私说明、法律合规说明和 `RUNNING.md` 快速说明。

## 开发者 CLI 用法

如果你要从源码运行，才需要安装 Rust：

```bash
cargo run -- \
  --nodes ./nodes.yaml \
  --output ./mobile-20260531.yaml \
  --fallback-region US
```

自定义模板和节点 URL：

```bash
unofficial-academia-clash-builder \
  --template https://example.com/template.yaml \
  --nodes https://example.com/nodes.yaml \
  --output desktop-20260531.yaml \
  --fallback-region US
```

常用参数：

- `--template`：模板 YAML 文件路径或 URL；不传时使用默认 Accademia Mobile 03 模板。
- `--nodes`：节点 YAML 文件路径或 URL；不传时使用模板自身的 `proxies`。
- `--output`：输出路径，默认 `clash-output.yaml`。
- `--fallback-region`：fallback 节点地区，例如 `US`；`auto` 或 `all` 表示全部可用节点。
- `--fallback-group`：fallback 策略组名称。
- `--no-hide-missing`：缺失节点信息的策略组不设置 `hidden: true`。
- `--report-json`：输出 JSON 报告。

## 重要限制

- 本项目只对部分 Accademia 模板和常见 Clash/mihomo YAML 结构做了简单测试。
- 不保证所有上游模板、分叉模板或客户端实现都可用。
- 生成配置使用前请自行检查。
- YAML 注释和手工排版不会保留，因为文件会被结构化解析并重新序列化。

详见 [DISCLAIMER.md](./DISCLAIMER.md) 和 [LEGAL.md](./LEGAL.md)。

## 鸣谢

- 上游模板和配置指南：[Accademia/Clash_Configuration_Template](https://github.com/Accademia/Clash_Configuration_Template)
- 网页端 YAML 解析：[js-yaml](https://github.com/nodeca/js-yaml)

详见 [NOTICE.md](./NOTICE.md)。

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
