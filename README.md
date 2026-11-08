# BiliTools 静态网站

面向使用者的功能介绍、真实界面展示与 APK 下载入口，提供简体中文（`/`）与英文（`/en/`）两个版本。网站采用原生 HTML / CSS / JavaScript，Vite 只负责开发服务和静态构建，不需要后端。下载区通过 GitHub Releases API 获取最新正式版，展示各架构的 APK 大小，并提供加速直链。

## 开发与构建

需要 Node.js 22.12+（或更新的 LTS）。在本目录运行：

```sh
# 安装依赖
npm install

# 编译生产版本，输出到 dist/（含 dist/index.html 与 dist/en/index.html）
npm run build

# 启动开发服务，绑定 0.0.0.0；英文页位于 /en/
npm run dev

# 本地预览已编译的 dist/
npm run preview
```

正式构建后的资源完整性校验及测试：

```sh
npm run check
npm test
```

`dist/` 是完整的静态网站，可部署到 GitHub Pages、Cloudflare Pages 或其他静态托管服务。资源使用相对路径，支持根目录及项目子路径。`dist/` 与 `node_modules/` 不纳入版本控制。

## 多语言

- **单一模板**：根目录 `index.html` 是唯一的页面模板，文案写成 `{{key}}` 占位符。`scripts/i18n-pages.mjs` 中的 Vite 插件在开发与构建时按 `src/locales/zh-CN.json`、`src/locales/en.json` 渲染出两个完整的静态页面；`en/index.html` 只是英文页的入口占位文件。两种语言首屏不闪烁，关闭 JavaScript 也能阅读和下载。
- **文案约定**：页面文案只允许不带属性的行内标签（如 `<br>`），插件统一转义双引号，可安全放入属性值。缺少任何文案时构建直接失败，不会把占位符发布出去。`app` 分组是脚本使用的运行时文案（主题按钮、发行版状态、配色预览等），通过 `src/i18n.js` 读取，`{name}` 形式的参数由调用方替换；页面文案不进入脚本包。
- **资源路径**：模板中的资源一律写根路径（如 `/assets/icons.svg#check`），Vite 构建时按页面位置改写为 `./assets/…` 或 `../assets/…`。脚本不拼接资源地址，需要切换的图标都预先写在 HTML 中。
- **语言切换**：顶栏按钮链接到另一语言的同一页面并保留当前锚点，选择保存在 `localStorage`。浏览器首选语言与页面不一致且从未选择过时，提示条（宽屏位于左下角，窄屏位于底部居中）用对方语言提示可切换版本；关闭即视为留在当前语言。不做自动跳转，避免影响搜索引擎收录各语言页面。
- **新增文案**：两个语言文件必须有完全相同的键，`npm test` 会校验键集合、运行时参数与模板渲染结果。

## 内容与资源维护

- `index.html`：页面模板，包括顶栏、首屏、功能卡片、界面展示、配色预览、下载、问答与页脚。核心内容直接存在于 HTML 中。
- `src/locales/`：中英文文案。
- `src/styles.css`：设计令牌（App 默认配色「蓝紫」的 Surface 层次、配色填充色与 Expressive 动效曲线）、明暗语义色与响应式布局。
- `src/main.js`：组装各模块，负责明暗偏好与导航高亮。首次跟随系统，手动选择只保存到当前浏览器；存储不可用时切换仍然有效。
- `src/showcase.js`：界面展示，采用焦点轮播。当前界面居中放大，两侧界面按距离缩小、淡出并压在后面，首尾相接；下方显示序号、标题与说明，筛选标签条、左右按钮、横向轻扫与方向键都能切换。点击两侧截图切换过去，点击中间截图放大查看。截图是中等尺寸、移动距离较长的元素，位置与缩放使用 MotionScheme.expressive() 的 DefaultSpatial 弹簧（阻尼 0.8、刚度 380，落位时只轻微回弹），透明度与说明文字使用 DefaultEffects；前后层级随位置过渡，两张截图交错到一半时才交换。按钮组、展开项圆角等小元素才使用 FastSpatial。未加载脚本时退化为可横向滚动的截图列表。
- `src/screenshot-viewer.js`：原生 dialog 放大查看，始终加载原图；关闭后展示区停在最后查看的界面。
- `src/expressive-buttons.js`：Expressive 交互反馈。鼠标悬停时圆角收紧；按下时保持悬停的形状，连接式按钮组向两侧挤压，并从按下位置播放水波纹（参数沿用 Compose RippleAnimation）。触摸没有悬停，按下即形变、挤压并播放水波纹；键盘 Enter / Space 从中心播放水波纹。水波纹的半径跟随所在表面的实时尺寸，按钮按下变宽或问答展开变高时仍铺满到边缘；表面默认是控件自身，也可以用 `data-ripple-surface` 指定控件内的一部分（色块）或包住控件的容器（问答整项）。
- `src/faq.js` 与 `src/spring.js`：问答展开与收起复刻 Compose AnimatedVisibility 的 expandVertically + fadeIn。`spring.js` 把 MotionScheme.expressive() 的弹簧参数（如 defaultSpatial：阻尼 0.8、刚度 380）换算成 Web Animations 的 `linear()` 缓动与时长；列表项的圆角与间距同时随弹簧过渡。
- `src/downloads.js`：发行版状态、安装包选择与直链切换，默认选中 `arm64-v8a`，日期与字节数按页面语言显示。
- `src/download-mascot.js`：下载区小电视的点击弹跳，沿用 App 关于页的动效节奏；九瓣底座独立旋转，离屏时暂停，遵循系统的减少动态效果偏好。
- `src/split-button.js`：分体按钮的原生弹出菜单，负责菜单定位、焦点和方向键导航。
- `src/palette-preview.js`：下载与导出预览面板，两行纯色圆形选色器点击后切换配色，悬停（触屏为按下）时色块从圆形微微鼓成九瓣饼干形；明暗胶囊只切换局部预览。预览中的输出类型支持点击、方向键和 Home / End，按压时展开并改变圆角，选择后更新格式说明。配色与卡片层次来自 App。
- `src/palette-celebration.js`：预览下载按钮触发与当前配色呼应的全屏彩带，使用 `canvas-confetti` 模拟纸带翻转和下落；Canvas 位于平滑滚动容器外，不拦截操作。连点重新播放，结束、Escape、切换后台或减少动态效果时清理；减少动态效果时仅显示文字反馈。
- `src/palettes.json`：Android 十三套主题的颜色角色快照。修改 App 配色后运行 `npm run palettes` 同步，也可通过 `npm run palettes -- <Android 项目根目录>` 指定位置；网站构建直接使用快照。
- `src/releases.js`：GitHub API 请求、发行版数据校验、加速地址、文件大小与日期格式化，以及网络不可用时使用的已发布版本快照。
- `src/motion.js`：GSAP ScrollSmoother 的桌面平滑滚动、首屏截图轻微视差、区块进场与锚点定位，保留浏览器原生滚轮事件。
- `src/screens.js`：截图清单与语言目录，生成脚本与页面共用。
- `public/assets/`：截图、App 图标、矢量图标 sprite 和字体，可直接构建，无需重新生成。

### 截图、图标与形状

截图、App 图标和矢量图标来自 Android 项目现有资源。默认目录结构为同级的 `BiliTools/` 与 `BiliTools-website/`；更新 `../BiliTools/docs/assets/screenshots/{zh,en}/` 后运行 `npm run assets`，同步 8 个界面 × 中英文 × 浅深色共 32 张截图。Android 仓库位于其他位置时，可运行 `npm run assets -- <Android 项目根目录>`。

每张截图输出两档：720 宽的 WebP 供常规屏幕显示，原图 JPG 原样复制（不重新编码）供高像素密度屏幕与放大查看，保留 Android 仓库中已无损优化的画质与 Display P3 色彩配置。页面通过 `srcset` 与 `sizes` 让浏览器按显示尺寸选择；明暗版本由 `<picture>` 切换，手动切换主题时由脚本同步。

App 图标使用透明底源文件，由 CSS 绘制背景与圆角，避免已有描边被二次裁切。图标生成器保留 group 位移、透明路径和偶奇填充，确保 Material Symbols 的负坐标路径正常显示。

功能卡片的图标容器与首屏的背景形状来自 `scripts/material-shapes.mjs`，以极坐标近似 Material 3 Expressive 形状库中的饼干、四叶草与花朵，参数与 Android 仓库 README 横幅（`docs/横幅/banner.html`）一致，随图标一起写入 `icons.svg`。近似公式位于 `src/material-shapes.js`，选色器的色块也用它在运行时生成点数相同的圆形与饼干形 `clip-path: polygon()`，两者之间才能逐点过渡。下载区的 `public/assets/cookie-nine.svg` 则直接导出自 App 当前依赖的 `MaterialShapes.Cookie9Sided`（Material 3 `1.5.0-alpha27`、Graphics Shapes `1.0.1`），保留原始三次贝塞尔控制点与 `toShape()` 的居中方式。升级形状库时应重新导出 `getCubics()`，不要手工描摹、简化曲线或分别拉伸横纵坐标。小电视沿用 App 的 46:64 画布比例，素材不透明本体的中心与底座旋转中心重合，底部阴影不参与居中计算。

### 字体

Google Sans Flex 来自 `../BiliTools/app/src/main/res/font/google_sans_flex.ttf`。网站固化 `ROND=100` 及其余未使用的轴，保留 400–700 可变字重并裁剪为拉丁字符。中文只使用系统自带、字重齐全的字体，依次为 Noto Sans SC（Windows 10/11 自 2025 年起随系统更新提供）、苹方（macOS / iOS）、Noto Sans CJK SC 与思源黑体（Linux）、微软雅黑（较旧的 Windows），Android 交给系统字体。不列 HarmonyOS Sans、MiSans 等需手动安装的字体：它们在电脑上常缺粗体或被拆成多个字体家族，而页面禁用了伪粗体，标题会显得很细。字体更新时运行：

```sh
python -m pip install fonttools brotli
python scripts/generate-font.py
```

Android 仓库位于其他位置时，将项目根目录作为最后一个参数传入，例如 `python scripts/generate-font.py D:\Projects\BiliTools`。

字体遵循 SIL Open Font License 1.1，完整文本见 `public/assets/licenses/Google-Sans-Flex-OFL.txt`，字体文件内的原始版权与许可证元数据亦予保留。

## 页面结构与交互

- **顶栏**：参照 MD3 Expressive 悬浮工具栏的胶囊，不用描边，配一层柔和阴影与页面分开。容器带一丝主色：浅色近白，88% 不透明加强模糊，只让下方内容的颜色映上来；深色比页面高一档并保持不透明——浏览器按 8 位色深合成，模糊后的渐变只跨几个色阶，暗部会出现明显的色彩断层。系统要求减少透明效果时浅色也改用不透明底。左侧品牌，中间为带图标的页内导航（功能／界面／下载／问答），右侧为语言切换、明暗切换与 GitHub；内部按钮不再各自垫底色，只有当前阅读的区块带选中指示。窄于 1080px 时导航只保留文字，窄于 720px 时收起导航，窄于 400px 时语言按钮只保留图标。所有图标入口保留至少 44px 的点击区域。
- **首屏**：占满一屏，只放首屏内容。左侧为标语、简介与操作按钮，右侧三张无边框截图（两侧微倾、中间居前）衬在柔和的 MD3E 形状上，全部直接放在页面底色上，不用卡片分隔；底部居中的「往下看看」提示下面还有内容。截图区域的宽度同时受列宽与可用高度约束，按宽度等比缩放（容器查询单位）。窄于 960px 时上下排列，「往下看看」紧跟文案，截图在下方露出。窄于 640px 时两个按钮并排成一组：「下载 BiliTools」占满剩余宽度，「查看源码」保持自身宽度，一行放不下两段文字时（英文，或极窄的屏幕）收成圆形的 GitHub 图标按钮；截图紧接着露出，因此省去「往下看看」。
- **功能卡片**：标题下方先列出支持解析的内容类型，再是六张不同配色的色块卡片（分享即解析、高规格音画质、完整导出、批量下载、13 种界面语言、数据留在本机），每张以 MD3E 形状作为图标容器；标题保持同一高度，编号、格式等附加信息贴底。MD3E 形状只用在首屏背景与这些图标容器上，其余区域不作装饰。
- **界面展示与放大查看**：见 `src/showcase.js` 与 `src/screenshot-viewer.js`。弹窗采用原生 `<dialog>` 管理焦点，尺寸由视口决定；图片解码后滑移淡入，快速切换只呈现最新请求，支持方向键与 Escape。
- **问答**：原生 `<details>` 组成的分段列表，首尾外角更圆，展开项四角变圆并与相邻项拉开距离，高度按弹簧曲线展开（见 `src/faq.js`）。整项是一个可点击的表面：悬停色与水波纹铺满整项，只用整项的圆角裁切，展开后标题行周围不会再出现一圈内层圆角；水波纹仍插在 `<summary>` 内（收起的 `<details>` 不渲染其余内容），由整项负责定位与裁切。
- **滚动**：桌面鼠标滚轮使用 0.6 秒平滑参数，触屏保留原生滚动。区块进场只改变透明度与位移，元素始终可聚焦；鼠标或触摸点击不会触发页面滚动，键盘聚焦时才把目标带入视野。
- 开启 `prefers-reduced-motion: reduce` 时禁用装饰动画、进场动画和滚动平滑过渡。
- 明暗主题使用与 App 协调的语义色；功能说明以 Android 仓库 README 为依据，音画质说明保留内容源与账号权限限制。
- `npm run check` 校验两个页面的语言属性、未渲染的占位符、HTML 锚点与无障碍引用、资源引用（含 `srcset` 每个候选）、脚本语法及构建后的相对资源路径；构建后的样式还会检查压缩是否丢掉了标准 `backdrop-filter`、每个动画是否都有对应的 `@keyframes`（这两类问题在开发服务中看不出来）。另外会实际渲染每个 SVG 图标以检查空白回归。浏览器布局与交互仍应在发布前按需要验收。

## 发行版与下载

- 每次打开页面请求一次 `https://api.github.com/repos/happycola233/BiliTools/releases/latest`，使用 GitHub REST API `2026-03-10` 版本，不需要令牌。GitHub 支持浏览器跨域读取；请求超时为 8 秒，失败后可手动重试，切换架构不重复请求。
- 最新版本号与发布日期来自发行版；安装包从已上传的 `BiliTools-…-{架构}.apk` 资产中匹配。使用 `browser_download_url` 核验资产来源，加速直链使用 `https://files.happycola.top/BiliTools/` 加实际文件名。镜像需同步同名文件；项目仓库与发行记录保留独立入口。
- 文件大小直接读取资产的 `size` 字节数，以 MiB（1 MiB = 1,048,576 字节）显示，每个选项均可查看；悬停大小可查看准确字节数。无需对安装包逐个发送探测请求。
- 支持 `arm64-v8a`、`armeabi-v7a`、`universal`、`x86` 和 `x86_64`。M3 Expressive 分体按钮的主操作直接下载，独立的展开按钮打开架构选择菜单，每项展示说明与大小。菜单使用原生 `popover="auto"` 和 `menuitemradio` 语义，支持上下方向键、Home / End、Enter / Space、Escape、Tab 与点击外部关闭；选择后更新加速下载直链。新版缺少某种架构时会禁用对应选项，不混用旧版安装包；完全没有 APK 时禁用下载及展开按钮。
- 分体按钮采用 M3 Expressive Medium 尺寸（高 56px）：左段为图标加单行标签「下载 BiliTools」，右段为下拉箭头，两段之间留 2px 缝隙；内侧小圆角在悬停或按下时变大，展开菜单时右段变为圆形并旋转箭头。当前安装包与大小显示在按钮下方的辅助说明中，切换架构后随之更新。菜单位于浏览器顶层，打开期间跟踪平滑滚动中的按钮位置，并根据视口空间向上或向下展开；菜单焦点不会触发页面平滑滚动。
- 初始展示已核验的发行版快照（当前为 v3.2），只有 API 成功返回后才标记为「最新版本」，成功后不再显示额外状态提示。请求失败保留明确版本号的可用下载；关闭 JavaScript 时也可直接下载快照中的 arm64-v8a 包。发布新版不影响在线自动更新；若要更新离线兜底版本，只需修改 `src/releases.js` 中的快照，构建时 i18n 插件会据此生成两个页面中的静态版本号、日期、大小与链接。
- 项目仓库、当前更新记录、历史版本与安装说明保留独立入口。`npm test` 覆盖新版文件匹配、架构缺失、异常响应、下载域名、大小单位、静态下载与快照的一致性，以及多语言文案的完整性。

接口、架构与组件参考：[GitHub 最新发行版 API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)、[Android ABI 说明](https://developer.android.com/ndk/guides/abis)、[M3 Expressive Split button](https://m3.material.io/components/split-button)、[WAI-ARIA 菜单按钮模式](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)、[WAI-ARIA 标签页模式](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)、[Google 多语言网站指南](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)。Material 当前尚未提供 Expressive split button 的官方 Web 实现，本站沿用原生 HTML / CSS / JavaScript 实现交互与设计规范。

设计和实现参考：[Material 3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)、[ScrollSmoother](https://gsap.com/docs/v3/Plugins/ScrollSmoother/)、[ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)、[Google Sans 字体许可](https://github.com/googlefonts/googlesans/blob/main/OFL.txt)。项目色彩依据 `../BiliTools/docs/配色系统/`，未修改 Android 的生成配色文件。

## 开源协议

网站源码及其中来自 App 的图标、截图与配色遵循 [GPL-3.0-or-later](LICENSE)，与 [BiliTools Android](https://github.com/happycola233/BiliTools) 一致。第三方内容保留各自的许可：Google Sans Flex 字体见上文「字体」；GSAP 使用其[标准许可](https://gsap.com/standard-license/)，构建保留库内 `/*! @license */` 形式的版权声明；canvas-confetti 遵循 ISC 许可。
