# isometric-contributions-plus

![Node.js CI](https://github.com/jasonlong/isometric-contributions/workflows/Node.js%20CI/badge.svg)
[![XO Code Style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)

This browser extension supports GitCode and GitHub. It adds a 3D isometric view to the contributions graph on user profile pages, provides a 2D/3D toggle, language switching (Chinese/English), and custom color palettes. It uses [obelisk.js](https://github.com/nosir/obelisk.js) to render voxel-style graphics.

## Features

- Dual platform support: `gitcode.com`, `github.com`
- 2D/3D view toggle (top-right buttons)
- Color themes and legend linkage; style presets (Slim/Normal/Wide/Thick Base/Tall)
- Popup language switching and custom palette (saved per platform)
- GitCode real data: auto-read tokens from browser cookies or use OpenAPI to fetch daily contributions; fallback to page ECharts or default data on failure
- HUD stats panel: Total, Average, Best Day, Streaks (Longest/Current), dates formatted as M/D
- Injected only on user profile pages; excludes `dashboard` and repository subpaths

**GitCode**

![isometric-contributions-plus](https://cdn.jsdelivr.net/gh/Qiuner/drawing-bed/2025/12/isometric-contributions-plus.jpg)

**GitHub**

<img src="img/preview.png" width="1052" />

## Installation

- Tutorial video:https://www.bilibili.com/video/BV1eGmbB9Ew2/?spm_id_from=333.1387.homepage.video_card.click

- Chrome/Brave/Edge: open the extensions page, enable “Developer mode”, click “Load unpacked”, and select the `src` directory

- Firefox: open `about:debugging`, choose “Load Temporary Add-on”, and select `src/manifest-v2.json`

- Build and package to a zip that can be dragged into the browser extensions page:

  Step 1: Build

  ```
  npm run build
  ```

  Step 2: Package to a browser extension zip

  ```
  if (Test-Path .\isometric-contributions-plus.zip) {
      Remove-Item .\isometric-contributions-plus.zip -Force
  };
  Compress-Archive -Path .\dist\* -DestinationPath .\isometric-contributions-plus.zip -Force;
  Get-Item .\isometric-contributions-plus.zip | Select-Object Name,Length,LastWriteTime

  ```

### Requirements

- Node.js `>= 20.0`

### Directory (excerpt)

- `src/manifest.json` Chrome MV3 manifest
- `src/manifest-v2.json` Firefox temporary add-on manifest
- `src/background.js` background script (reads GitCode cookies)
- `src/popup/` popup page and logic (`popup.html`, `popup.css`, `popup.js`)
- `src/iso.js` GitCode injection and rendering
- `src/github/iso.js` GitHub injection and rendering
- `src/api.js` GitCode OpenAPI access and data normalization
- `src/palette.js` theme palettes and legend linkage

## Usage

- Open a GitCode or GitHub user profile page
- Use the top-right buttons to switch 2D/3D; choose palette and style
- Click the extension icon to choose Chinese or English in the popup, and configure a custom palette
- If not signed in or no tokens are found on GitCode, default data is shown with a hint

## Development

If you want to customize the extension, you may need to install it manually. First, clone or fork this repository. Then, on the Chrome Extensions page, enable “Developer mode”, click “Load unpacked”, and select the repository folder.

<img src="img/dev-mode.png" width="981" />

After making changes, return to the Extensions page and click the “Reload” link under the extension entry to apply the changes.

<img src="img/reload-link.png" width="410" />

Feel free to open a pull request for improvements.

## Permissions and Data Sources

- GitCode data priority: API → default data → page ECharts data
- GitHub data source: parse the page SVG and tooltip to aggregate counts

## Acknowledgements and Origin

- Based on Jason Long’s open-source project [isometric-contributions](https://github.com/jasonlong/isometric-contributions) (MIT)
- Heavily refactored for multi-platform support (GitHub + GitCode), rendering workflow, language switching, data source integration, legend linkage, and style presets
- MIT license retained with original copyright notice

## License

Released under the [MIT License](http://opensource.org/licenses/MIT).

# Isometric Contributions 3D (GitHub & GitCode)

![Node.js CI](https://github.com/jasonlong/isometric-contributions/workflows/Node.js%20CI/badge.svg)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)

This extension supports both GitHub and GitCode. It renders a 3D isometric pixel view for the contribution chart and lets you toggle between 2D/3D. It also supports per-site language switching (English/Chinese). It uses [obelisk.js](https://github.com/nosir/obelisk.js) for the isometric graphics.

Features:

- Dual platforms: `github.com` and `gitcode.com`
- 2D/3D toggle via buttons on the page
- Color palettes and legend sync, multiple styles (slim/wide/thick base)
- Popup language switching per site (states not shared)
- GitCode real data: read tokens from browser cookies or use OpenAPI to fetch daily contributions; falls back to page ECharts or default data
- HUD stats: total, average, best day, streaks (longest/current), M/D date format
- Inject only on user profile pages; excludes `dashboard` and repository subpaths

**GitCode**

![](https://cdn.jsdelivr.net/gh/Qiuner/drawing-bed/2025/12/image-20251207161452738.png)

**GitHub**

<img src="img/preview.png" width="1052" />

## Installation

Chrome/Brave/Edge: open the extensions page, enable Developer mode, click “Load unpacked” and select the `src` directory.

Firefox: open `about:debugging`, choose “Load Temporary Add-on” and select `src/manifest-v2.json`.

Permissions: uses `storage` for settings; `cookies` and `host_permissions` for GitCode domain and its Web API.

## Usage

- Open a GitCode or GitHub profile page
- Use page buttons to switch 2D/3D; choose palette and style
- Click the extension icon and pick English or 中文 in the popup (per site)
- On GitCode, if not signed in or without tokens, the default dataset is shown with a notice

## Contributing

Install in Developer mode (see Installation). After changes, click Reload under the extension entry on the extensions page.

## Development

- `src/iso.js` (GitCode content script)
- `src/github/iso.js` (GitHub content script)
- `src/palette.js` (color palettes and legend helpers)
- `src/popup.*` (extension popup UI and logic)

## Credits & Origin

- This project is a derivative work of Jason Long’s open-source project [isometric-contributions](https://github.com/jasonlong/isometric-contributions) (MIT)
- The original MIT license and copyright notices are preserved; see `LICENSE`
- Additions include GitCode support, per-site language switching, data source integration, legend syncing, and style variants

## License

This project is licensed under the [MIT License](http://opensource.org/licenses/MIT).
