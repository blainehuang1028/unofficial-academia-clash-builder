# Running the Release Package

This release package is precompiled. You do not need Rust, Cargo, Node.js, or any compilation step.

## macOS / Linux

Run from the extracted package directory:

```bash
./run.sh --nodes ./nodes.yaml --output ./mobile.yaml --fallback-region US
```

Use a custom template:

```bash
./run.sh --template ./template.yaml --nodes ./nodes.yaml --output ./output.yaml
```

Show help:

```bash
./run.sh --help
```

On macOS, if Gatekeeper says the binary is from an unidentified developer, remove the quarantine attribute after extracting:

```bash
xattr -dr com.apple.quarantine .
```

## Windows

Run from the extracted package directory in PowerShell:

```powershell
.\run.ps1 --nodes .\nodes.yaml --output .\mobile.yaml --fallback-region US
```

Or use Command Prompt:

```cmd
run.cmd --nodes nodes.yaml --output mobile.yaml --fallback-region US
```

Show help:

```powershell
.\run.ps1 --help
```

## 中文说明

Release 包已经包含编译好的程序，不需要安装 Rust，也不需要二次编译。

macOS / Linux 解压后运行：

```bash
./run.sh --nodes ./nodes.yaml --output ./mobile.yaml --fallback-region US
```

Windows PowerShell 解压后运行：

```powershell
.\run.ps1 --nodes .\nodes.yaml --output .\mobile.yaml --fallback-region US
```

如果需要指定自定义模板，增加 `--template` 参数即可。
