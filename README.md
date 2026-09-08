# BiliTools 静态网站

面向使用者的功能介绍、真实界面展示与 APK 下载入口。网站采用原生 HTML / CSS / JavaScript，Vite 只负责开发服务和静态构建，不需要后端。下载区通过 GitHub Releases API 获取最新正式版，展示各架构的 APK 大小，并提供加速直链。

## 开发与构建

需要 Node.js 22.12+（或更新的 LTS）。在本目录运行：

```sh
# 安装依赖
npm install

# 编译生产版本，输出到 dist/
npm run build

# 启动开发服务，绑定 0.0.0.0
npm run dev

# 本地预览已编译的 dist/
npm run preview
```

正式构建后的资源完整性校验及测试：

```sh
npm run check
npm test
```

`dist/` 是完整的静态网站，可部署到 GitHub Pages、Cloudflare Pages 或其他静态托管服务。资源使用相对路径，支持根目录及项目子路径。构建产物和依赖均已忽略，不影响 Android 构建。Sites 的静态输出配置保存在 `.openai/hosting.json`；注册不代表已经发布。

## 内容与资源维护

- `index.html`：页面文案、下载链接和截图说明。核心内容直接存在于 HTML 中，关闭 JavaScript 仍可阅读、横向浏览截图和前往下载。
- `src/styles.css`：明暗语义色与响应式布局。
- `src/main.js`：明暗偏好、画廊翻页和导航状态。首次跟随系统，手动选择只保存到当前浏览器；存储不可用时切换仍然有效。
- `src/downloads.js`：发行版状态、安装包选择与直链切换，默认选中 `arm64-v8a`。
- `src/download-mascot.js`：下载区小电视的点击弹跳，沿用 App 关于页的动效节奏；九瓣底座独立旋转，离屏时暂停，遵循系统的减少动态效果偏好。
- `src/split-button.js`：分体按钮的原生弹出菜单，负责菜单定位、焦点和方向键导航。
- `src/releases.js`：GitHub API 请求、发行版数据校验、加速地址与文件大小格式化，以及网络不可用时使用的已发布版本快照。
- `src/motion.js`：GSAP ScrollSmoother 的桌面平滑滚动、首屏轻微视差和锚点定位，保留浏览器原生滚轮事件。
- `src/feature-story.js`：三步功能介绍，支持点击和方向键选择步骤；宽屏短暂停留时随滚动切换，在固定手机框内横向滑动截图。
- `src/screenshot-viewer.js`：原生 dialog 放大查看，固定弹窗尺寸并对图片进行方向切换动画。
- `public/assets/`：已压缩的截图、App 图标、矢量图标 sprite 和字体，可直接构建，无需重新生成。

截图、App 图标和矢量图标来自 Android 项目现有资源。默认目录结构为同级的 `BiliTools/` 与 `BiliTools-website/`；更新 `../BiliTools/docs/assets/screenshots/` 后运行 `npm run assets` 同步六组浅色／深色截图。Android 仓库位于其他位置时，可运行 `npm run assets -- <Android 项目根目录>`。App 图标使用透明底源文件，由 CSS 绘制背景与圆角，避免已有描边被二次裁切。生成器保留当前图标中的 group 位移、透明路径和偶奇填充，确保 Material Symbols 的负坐标路径正常显示。

下载区的 `public/assets/cookie-nine.svg` 直接导出自 App 当前依赖的 `MaterialShapes.Cookie9Sided`（Material 3 `1.5.0-alpha27`、Graphics Shapes `1.0.1`），保留原始三次贝塞尔控制点与 `toShape()` 的居中方式。升级形状库时应重新导出 `getCubics()`，不要手工描摹、简化曲线或分别拉伸横纵坐标。小电视沿用 App 的 46:64 画布比例，素材不透明本体的中心与底座旋转中心重合，底部阴影不参与居中计算。

Google Sans Flex 来自 `../BiliTools/app/src/main/res/font/google_sans_flex.ttf`。网站固化 `ROND=100` 及其余未使用的轴，保留 400–700 可变字重并裁剪为拉丁字符，中文使用系统字体。字体更新时运行：

```sh
python -m pip install fonttools brotli
python scripts/generate-font.py
```

Android 仓库位于其他位置时，将项目根目录作为最后一个参数传入，例如 `python scripts/generate-font.py D:\Projects\BiliTools`。

字体遵循 SIL Open Font License 1.1，完整文本见 `public/assets/licenses/Google-Sans-Flex-OFL.txt`，字体文件内的原始版权与许可证元数据亦予保留。App 素材和网站源码遵循项目根目录的开源协议。第三方 GSAP 使用其[标准许可](https://gsap.com/standard-license/)，构建保留库内的许可声明。

## 交互与兼容性

- 顶栏优先保留品牌、主题切换与 GitHub，两个图标入口均保留至少 44px 的点击区域；窄于 480px 时收起“功能／界面／下载”页内导航，较宽屏幕继续显示。
- 首屏按 CSS 视口的宽度与高度共同调整字标、标题、截图和间距，桌面图文在导航栏与底部提示之间整体居中，下载按钮保留原有尺寸；使用 `svh` 为移动端浏览器工具栏保留空间。「往下看看」独占一行，桌面位于首屏底部；窄于 760px 时排列在文案和截图之间，先呈现下载入口与滚动提示。矮于 620px 的横向视口进一步收紧间距；高度不超过 520px 时省去与导航重复的装饰字标。内容保持自然排版，不使用整页缩放或固定高度裁切。
- 桌面鼠标滚轮使用 0.6 秒平滑参数；触屏保留原生滚动。平滑容器独立于布局断点，调整窗口大小不会反复重建。
- 功能介绍共用一个稳定的图文区域，三步入口始终可见。足够宽高时短暂停留，随滚动切换步骤；窄屏、放大页面及减少动态效果时直接点击切换。图片保持不透明并在手机框内横向滑动。首屏三张截图仅做轻微视差。
- 开启 `prefers-reduced-motion: reduce` 时禁用装饰动画和滚动平滑过渡。
- 截图支持触摸横滑、按钮翻页、点击放大、方向键切换及 Escape 关闭；画廊隐藏滚动条，保留原生横向滚动。弹窗采用原生 `<dialog>` 管理焦点，尺寸由视口决定，短标题不会撑宽布局；图片解码后滑移淡入，快速切换只呈现最新请求，连续点击不会选中页码。
- 明暗主题使用与 App 协调的语义色；功能说明以仓库 README 为依据，音画质说明保留内容源与账号权限限制。
- `npm run check` 校验 HTML 内部锚点、资源引用、脚本语法及构建后的相对资源路径，并实际渲染每个 SVG 图标以检查空白回归。浏览器布局与交互仍应在发布前按需要验收。

## 发行版与下载

- 每次打开页面请求一次 `https://api.github.com/repos/happycola233/BiliTools/releases/latest`，使用 GitHub REST API `2026-03-10` 版本，不需要令牌。GitHub 支持浏览器跨域读取；请求超时为 8 秒，失败后可手动重试，切换架构不重复请求。
- 最新版本号与发布日期来自发行版；安装包从已上传的 `BiliTools-…-{架构}.apk` 资产中匹配。使用 `browser_download_url` 核验资产来源，加速直链使用 `https://files.happycola.top/BiliTools/` 加实际文件名。镜像需同步同名文件；项目仓库与发行记录保留独立入口。
- 文件大小直接读取资产的 `size` 字节数，以 MiB（1 MiB = 1,048,576 字节）显示，每个选项均可查看；悬停大小可查看准确字节数。无需对安装包逐个发送探测请求。
- 支持 `arm64-v8a`、`armeabi-v7a`、`universal`、`x86` 和 `x86_64`。M3 Expressive 分体按钮的主操作直接下载，独立的展开按钮打开架构选择菜单，每项展示说明与大小。菜单使用原生 `popover="auto"` 和 `menuitemradio` 语义，支持上下方向键、Home / End、Enter / Space、Escape、Tab 与点击外部关闭；选择后更新加速下载直链。新版缺少某种架构时会禁用对应选项，不混用旧版安装包；完全没有 APK 时禁用下载及展开按钮。
- 分体按钮在桌面端高 68px，窄于 760px 时高 60px，并同步收紧文字与内边距；宽度随内容收紧，外侧圆角随高度调整，展开时改变圆角并旋转箭头。按钮内展示架构与大小，不再单独展示文件名。架构菜单用连接式列表和独立选中形状，功能介绍用连接式按钮组及按压形变。浅色、深色共用语义色；减少动态效果时禁用过渡与弹出动画。菜单位于浏览器顶层，打开期间跟踪平滑滚动中的按钮位置，并根据视口空间向上或向下展开；菜单焦点不会触发页面平滑滚动。
- 初始展示已核验的 v3.0 快照，只有 API 成功返回后才标记为「最新版本」，成功后不再显示额外状态提示。请求失败保留明确版本号的可用下载；关闭 JavaScript 时也可直接下载 v3.0 的 arm64-v8a 包。发布新版不影响在线自动更新；若要更新离线兜底版本，同步修改 `src/releases.js` 中的快照与 `index.html` 中的初始版本、日期、文件名、大小及链接。
- 项目仓库、当前更新记录、历史版本与安装说明保留独立入口。`npm test` 覆盖新版文件匹配、架构缺失、异常响应、下载域名、大小单位和静态下载与快照的一致性。

接口、架构与组件参考：[GitHub 最新发行版 API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)、[Android ABI 说明](https://developer.android.com/ndk/guides/abis)、[M3 Expressive Split button](https://m3.material.io/components/split-button)、[WAI-ARIA 菜单按钮模式](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)。Material 当前尚未提供 Expressive split button 的官方 Web 实现，本站沿用原生 HTML / CSS / JavaScript 实现交互与设计规范。

设计和实现参考：[Material 3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)、[ScrollSmoother](https://gsap.com/docs/v3/Plugins/ScrollSmoother/)、[ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)、[Google Sans 字体许可](https://github.com/googlefonts/googlesans/blob/main/OFL.txt)。项目色彩依据 `../BiliTools/docs/配色系统/`，未修改 Android 的生成配色文件。
