# Unofficial Accademia Clash Builder

An unofficial helper for generating Clash/mihomo YAML configurations from the excellent
[Accademia/Clash_Configuration_Template](https://github.com/Accademia/Clash_Configuration_Template)
templates and your own node list.

This project is not affiliated with Accademia. It credits Accademia as the upstream template author and only provides a small transformation tool around those templates.

[中文说明](./README.zh-CN.md)

## Live Demo

GitHub Pages:

```text
https://blainehuang1028.github.io/unofficial-academia-clash-builder/
```

## What It Does

- Loads an Accademia preset template, a custom URL, a local file, or pasted YAML.
- Loads a Clash/mihomo node YAML from URL, file, or pasted content.
- Injects usable nodes into `proxies`.
- Converts template filter-based groups into explicit `proxies` lists.
- If a group has no matching node information, it injects a fallback group and sets `hidden: true`.
- Preserves routing data: `rules`, `rule-providers`, and `dns.nameserver-policy`.
- Avoids empty groups that can become `COMPATIBLE` in some Clash/mihomo clients.

## Web Presets

The web app includes 12 Accademia template presets:

- Mobile: `01`, `02-Min.AntiAD`, `03-Non.AntiAD`
- Desktop: `01`, `02-Min.AntiAD`, `03-Non.AntiAD`
- Universal: `01`, `02-Min.AntiAD`, `03-Non.AntiAD`
- BlackList: `01`, `02-Min.AntiAD`, `03-Non.AntiAD`

The default preset is:

```text
https://cdn.jsdelivr.net/gh/Accademia/Clash_Configuration_Template/[Mobile]-WhiteList-03-Non.AntiAD.yaml
```

## Privacy

The GitHub Pages web app is static and runs the YAML transformation in your browser. It does not run a backend service and does not store uploaded files, pasted content, generated YAML, node names, server addresses, or subscription URLs.

When you load a template or node list by URL, your browser directly requests that URL. Custom URLs must allow browser CORS access; otherwise, use file upload or paste the YAML manually.

See [PRIVACY.md](./PRIVACY.md).

## Download and Run

You do not need Rust or any compilation step if you download a release package.

1. Open the latest release:

   ```text
   https://github.com/blainehuang1028/unofficial-academia-clash-builder/releases/latest
   ```

2. Download the package for your system:

   - macOS Apple Silicon: `unofficial-academia-clash-builder-macos-arm64.tar.gz`
   - Linux x64: `unofficial-academia-clash-builder-linux-x64.tar.gz`
   - Windows x64: `unofficial-academia-clash-builder-windows-x64.zip`

3. Extract the package and run the included script:

   macOS / Linux:

   ```bash
   ./run.sh --nodes ./nodes.yaml --output ./mobile.yaml --fallback-region US
   ```

   Windows PowerShell:

   ```powershell
   .\run.ps1 --nodes .\nodes.yaml --output .\mobile.yaml --fallback-region US
   ```

Each package also contains the compiled binary, run script, English and Chinese README files, release notes, license, notices, disclaimer, privacy policy, legal-use notes, and a `RUNNING.md` quick-start file.

## CLI Usage for Developers

If you want to build from source, install Rust, then run:

```bash
cargo run -- \
  --nodes ./nodes.yaml \
  --output ./mobile-20260531.yaml \
  --fallback-region US
```

Using custom template and node URLs:

```bash
unofficial-academia-clash-builder \
  --template https://example.com/template.yaml \
  --nodes https://example.com/nodes.yaml \
  --output desktop-20260531.yaml \
  --fallback-region US
```

Options:

- `--template`: template YAML path or URL. If omitted, the default Accademia Mobile 03 template is used.
- `--nodes`: node YAML path or URL. If omitted, the tool uses the template's own `proxies`.
- `--output`: output YAML path. Default: `clash-output.yaml`.
- `--fallback-region`: fallback node region, for example `US`; `auto` or `all` uses all usable nodes.
- `--fallback-group`: fallback group name.
- `--no-hide-missing`: do not set `hidden: true` on missing-node groups.
- `--report-json`: print a JSON report.

## GitHub Pages Deployment

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.
Push to `main`, then enable GitHub Pages with source set to GitHub Actions if it is not already enabled.

The site is served from the `web/` directory.

## Releases

Tagged releases are built by `.github/workflows/release.yml`.

Create a release tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

The workflow builds ready-to-run CLI packages for macOS, Linux, and Windows. Users should download release assets rather than source archives.

## Important Limitations

- This tool is tested with selected Accademia templates and common Clash/mihomo YAML structures.
- It does not guarantee that every upstream template, forked template, or client implementation will work.
- Generated files should be reviewed before use.
- YAML comments and manual formatting are not preserved because the file is parsed and serialized structurally.

See [DISCLAIMER.md](./DISCLAIMER.md) and [LEGAL.md](./LEGAL.md).

## Credits

- Template design and upstream guidance: [Accademia/Clash_Configuration_Template](https://github.com/Accademia/Clash_Configuration_Template)
- YAML parser used in the web app: [js-yaml](https://github.com/nodeca/js-yaml)

See [NOTICE.md](./NOTICE.md).

## License

MIT. See [LICENSE](./LICENSE).
