# isometric-contributions-plus

![Node.js CI](https://github.com/jasonlong/isometric-contributions/workflows/Node.js%20CI/badge.svg)
[![XO 代码样式](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)

这是一个支持 GitCode 与 GitHub 的浏览器扩展，在用户主页的贡献图处提供 3D 等距像素视图与 2D/3D 切换，并支持中文/英文切换与自定义配色。使用 [obelisk.js](https://github.com/nosir/obelisk.js) 绘制立体图像。

主要能力：

- 双平台支持：`gitcode.com`、`github.com`
- 2D/3D 显示切换（右上按钮）
- 颜色主题与图例联动，支持样式切换（细瘦/标准/宽胖/小图/高柱）
- 弹窗中英文切换与自定义配色
- GitCode 真实数据：自动读取浏览器 Cookie 中的令牌或使用 OpenAPI 拉取每日贡献；失败回退页面 ECharts 或默认数据
- HUD 统计面板：总计、平均、最佳日、连续（最长/当前），日期格式为 M/D
- 仅在用户主页注入，排除 `dashboard` 与仓库子路径页面

**GitCode端**

![isometric-contributions-plus](https://cdn.jsdelivr.net/gh/Qiuner/drawing-bed/2025/12/isometric-contributions-plus.jpg)

**GItHUB端**

<img src="img/preview.png" width="1052" />

## 安装

- 使用说明视频：https://www.bilibili.com/video/BV1eGmbB9Ew2/?spm_id_from=333.1387.homepage.video_card.click

- Chrome/Brave/Edge：打开扩展管理页面，开启“开发者模式”，点击“加载已解压的扩展程序”，选择 `src` 目录

- Firefox：打开 `about:debugging`，选择“临时加载附加组件”，选择 `src/manifest-v2.json`

- 下载源码也可通过下面两步骤做成能直接拖入浏览器拓展的压缩包

  一：构建

  ```
  npm run build
  ```

  二：打包成浏览器插件

  ```
  if (Test-Path .\isometric-contributions-plus.zip) {
      Remove-Item .\isometric-contributions-plus.zip -Force
  };
  Compress-Archive -Path .\dist\* -DestinationPath .\isometric-contributions-plus.zip -Force;
  Get-Item .\isometric-contributions-plus.zip | Select-Object Name,Length,LastWriteTime
  
  ```

### 环境要求

- Node.js `>= 20.0`

### 目录结构（节选）

- `src/manifest.json` Chrome MV3 清单
- `src/manifest-v2.json` Firefox 临时加载清单
- `src/background.js` 后台脚本（读取 GitCode 相关 Cookie）
- `src/popup/` 弹窗页面与逻辑（`popup.html`、`popup.css`、`popup.js`）
- `src/iso.js` GitCode 端注入与渲染
- `src/github/iso.js` GitHub 端注入与渲染
- `src/api.js` GitCode OpenAPI 访问与数据归一化
- `src/palette.js` 主题调色板与图例联动

## 使用

- 打开 GitCode 或 GitHub 用户主页
- 使用页面右上角按钮切换 2D/3D；选择配色与样式
- 点击扩展图标，在弹窗中选择中文或 English，并可设置自定义配色
- GitCode 端若未登录或无令牌，将展示默认数据并显示提示

## 开发

如果您想自定义扩展程序，那么你可能需要手动安装它。首先先克隆或分叉此仓库，然后，在 Chrome 扩展程序 页面上，选中 “开发人员模式，点击 “加载已解压缩的扩展程序……” 按钮，然后选定仓库所在的文件夹即可。

![image-20251209180905883](https://cdn.jsdelivr.net/gh/Qiuner/drawing-bed/2025/12/image-20251209180905883.png)

![image-20251209180955991](https://cdn.jsdelivr.net/gh/Qiuner/drawing-bed/2025/12/image-20251209180955991.png)

要自定义该扩展程序，首先需要确保已在开发人员模式下安装了该扩展程序（参见上文）。对扩展程序进行更改后，请返回 “扩展程序” 页面，然后单击扩展程序条目下的 “重新加载” 链接。

![image-20251210094934793](https://cdn.jsdelivr.net/gh/Qiuner/drawing-bed/2025/12/image-20251210094934793.png)

如果你有什么改进的内容，请随时打开一个拉取请求。

## 数据来源

- GitCode 数据来源优先级：API → 默认数据 → 页面 ECharts 数据
- GitHub 数据来源：解析页面 SVG 与 Tooltip 统计

## 致谢与来源说明

- 本项目基于 Jason Long 的开源项目 [isometric-contributions](https://github.com/jasonlong/isometric-contributions)（MIT）二次开发
- 在多平台适配（GitHub + GitCode）、渲染流程方面进行了大幅度重构。新增 GitCode 平台支持、语言切换、数据源整合、图例联动与样式扩展等功能
- 本项目沿用 MIT 协议，并保留原作者的版权声明

## 开源协议

本项目以 [MIT License](http://opensource.org/licenses/MIT) 协议开源。
