---
name: xhs-auto-publish
description: 小红书创作者中心自动发布。支持图文/视频上传、标题描述填写、截图确认。使用 Puppeteer 连接 Chrome 调试实例（端口 9222）。触发场景：小红书自动发布、小红书运营、嗨舞舞室小红书分发。
---

# 小红书创作者中心自动发布

> **当前版本**: v1.15（自动发布）
> **最后更新**: 2026-05-26 15:45

## 前置条件

1. **Chrome 调试模式已启动**（与抖音共用同一实例）：
   ```
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/Users/popoll/.openclaw/chrome-debug-profile --no-first-run
   ```
   - **Cookie 保存位置**：`/Users/popoll/.openclaw/chrome-debug-profile`
   - Chrome 进程崩溃或异常退出后，重新执行上述启动命令即可恢复登录状态

2. **小红书创作者中心已登录**：`https://creator.xiaohongshu.com/publish/publish`

3. **Puppeteer 已安装**：`/Users/popoll/.openclaw/workspace/node_modules/puppeteer`

### ⚠️ Cookie 保护铁律（最高优先级）
- **保护 Cookie 是第一位的！** 每次执行发布脚本前，必须先检查登录状态
- **执行前先检查**：连接 Puppeteer 后访问 creator.xiaohongshu.com，检测页面是否出现「扫码登录」/「手机号登录」，如未登录立即停止并截图汇报
- **严禁反复启动 Chrome**：反复启动/连接 debug 实例会导致 Cookie 值被清空或损坏
- **失败一次就停手**：脚本执行报错、超时、页面异常，立刻中止，截图向主人汇报，不反复尝试
- **端口不可用时向主人汇报**，不要自动重启 Chrome 折腾

### Chrome 启动检查逻辑

在运行发布脚本前，仅检查 9222 端口是否可用：
```bash
lsof -iTCP:9222 -sTCP:LISTEN > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Chrome 未启动，请主人确认后手动启动"
fi
```

## 自动发布视频

### 📋 主人标准工作流程

**⚠️ 铁律：主人每次发视频，必须主动触发此流程，无需主人重复指令。**

```
步骤1: 接收视频素材
  → 主人发送舞蹈视频文件
  → 保存视频，绝对不压缩画质，保留原画质

步骤2: 接收文案参考截图
  → 主人发送参考文案+话题的截图
  → 分析截图的文案风格和话题标签
  → **⚠️ 小红书标题最多20个字！不能超过20个字符！**
  → **⚠️ 必须先 memory_search 搜索往期小红书标题风格（搜索关键词："小红书标题 发布 历史 往期"），分析往期标题格式（如：歌名 | 一句话感受 + emoji）**
  → 结合截图文案 + 往期标题风格，生成嗨舞版标题建议
  → 等待主人确认步骤3: 向主人汇报建议
  → 「主人，建议：
     标题：xxx
     话题（6个）：#南阳嗨舞 #南阳嗨舞工作室 #xxx #xxx #xxx #xxx
     请确认或提出修改」

步骤4: 自动填写内容（主人确认后）
  → 视频：上传原文件
  → 标题：用 value setter + Event 注入（参考截图文案生成嗨舞版标题）
  → 正文：**只填话题**，不写其他文案
  → 话题：逐个输入 #话题名 → 等弹窗 → 点击推荐项 → 空格分隔（必须逐个触发才能变蓝）
  → 位置：锦湖电脑数码城（滚动到位置选择器 → 点击 .address-card-select → 点击搜索框 → 输入关键词 → 点击第一个搜索结果）
  → 截图推送到主人 QQ 确认

步骤5: 发布前确认
  → 截图给主人检查填写内容
  → 等待主人说「发布」或类似确认
  → ⚠️ 未经主人同意，绝不擅自发布

步骤6: 执行发布
  → 找到 <XHS-PUBLISH-BTN> 自定义元素 → 计算坐标 → 点击右侧 65% 位置
  → 发布成功标志：URL 包含 published=true
```

**铁律：**
- 🚫 绝不压缩视频画质
- 🚫 发布前必须经主人确认
- 🚫 每次话题必须包含 #南阳嗨舞 和 #南阳嗨舞工作室
- 🚫 文案风格必须参考主人发的截图
- 🚫 生成标题前必须先 memory_search 搜索往期小红书标题风格，禁止跳过往期标题直接生成
- 🚫 未经主人同意，绝不擅自发布
- 📐 执行前必须先最大化 Chrome 窗口（AppleScript 激活 + page.setViewport），发布按钮坐标按照最大化后的窗口计算

---

### 🔄 两阶段工作模式

#### 模式 1: 填写模式（安全模式）
```bash
node xhs_auto_publish.js -s -v <视频> -t <标题> -h <话题>
```
**执行流程**：上传视频 → 填写表单 → 截图推送给主人确认 → **不发布**

#### 模式 2: 发布模式
```bash
node xhs_auto_publish.js -p
```
**执行流程**：连接当前页面 → 滚动到底部 → 关闭弹窗 → 找到 `<XHS-PUBLISH-BTN>` → 计算坐标 → 点击发布

**优势**：
- 避免确认发布时重复输入文案
- 主人说"发布"后直接执行，无需重新跑完整流程

---

### 技术流程

1. **导航到发布页**：`https://creator.xiaohongshu.com/publish/publish`
2. **切换到视频模式**：点击「上传视频」tab
3. **上传视频文件**：通过 `input[type="file"]` 的 `uploadFile()` 方法注入
4. **填写标题**：用 `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set` 注入
5. **填写话题**：正文只填话题，不写其他文案；逐个输入 `#话题名` → 等待 2 秒弹窗 → 点击 `.item` 匹配项 → 输入空格分隔
6. **添加 POI 定位**：`scrollIntoView({ block: 'center' })` → `tabIndex=0` + `focus()` → **`page.keyboard.press('Enter')` 打开弹窗** → `keyboard.type('锦湖电脑数码城')` → 找结果点击 或 `ArrowDown` + `Enter`
7. **开启原创声明**（v1.15 修复）：滚动到内容设置区域 → 精准定位 `.original-wrapper` 内的 `.d-switch` 开关（⚠️ 不是外层容器，v1.14 误点文字区域）→ 用 `page.mouse.click()` 点击开关中心 → 弹窗中勾选"我已阅读并同意" → 点击"声明原创"按钮 → 验证 `.d-switch-simulator` 的 class 包含 `checked` 且不含 `unchecked`（⚠️ v1.15 修复字符串误判）
8. **截图确认**：使用 `page.screenshot({ fullPage: true })` 截取整个页面推送给主人（️ 必须全图，不可用 clip 裁剪）
9. **执行发布**：滚动到底部 → 关闭弹窗 → 找到 `<XHS-PUBLISH-BTN>` → `page.mouse.click(1000, 824)`

### 关键选择器与方法（v1.1）

| 元素 | 选择器/方法 | 注意事项 |
|------|--------|---------|
| 文件上传 | `input[type="file"]` | `uploadFile()` 方法 |
| 标题输入 | `input[placeholder*="标题"]` | `value setter` + `Event('input')` |
| 话题编辑器 | `.tiptap, .ProseMirror` | 清空用 `innerHTML = ''` |
| 话题输入 | `execCommand('insertText', false, '#' + tag)` | **必须用此方法**，page.keyboard.type 和 CDP 均无效 → 等弹窗 → 点击 `.items .item` 或 Enter 兜底 |
| 位置选择 | `.address-card-select` | `scrollIntoView` → `tabIndex=0` → `focus()` → **`Enter` 键打开弹窗**（⚠️ 点击无效！v1.9 修复）→ 搜索 → 选结果 |
| 位置搜索 | `page.keyboard.type()` | 关键词：锦湖电脑数码城，搜索后点击第一个结果 |
| 发布按钮容器 | `xhs-publish-btn, XHS-PUBLISH-BTN` | 自定义 Web Component，Shadow DOM closed 模式 |
| 发布按钮坐标 | 容器 x=438, y=779, w=864, h=90 | 点击右侧 65%：`x = rect.x + rect.width * 0.65` |
| 发布成功标志 | URL 包含 `published=true` | 页面跳转到空白上传页 |

### 话题变蓝技术方案（核心 v1.3）

**为什么不能一次性输入所有话题？**
- 用一次性注入的文本，话题永远是**黑色普通文字**
- 小红书的话题编辑器使用 TipTap ProseMirror 编辑器，需要触发 hashtag 解析器才能转换为蓝色链接 `<a class="tiptap-topic">`
- **⚠️ `page.keyboard.type()` 和 CDP `Input.insertText` 均无法触发 TipTap 话题解析器**，编辑器会吃掉 `#` 符号或不响应

**正确方法（v1.3 稳定版）：**
```javascript
for (const tag of hashtags) {
  // 1. 用 execCommand('insertText') 插入 #话题
  await page.evaluate((t) => {
    const editor = document.querySelector('.tiptap, .ProseMirror');
    editor.focus();
    document.execCommand('insertText', false, '#' + t);
  }, tag);
  await sleep(2000);
  
  // 2. 在 .tippy-box 弹窗中查找并点击推荐话题
  // 等弹窗出现（最多 3 秒）
  let popupVisible = false;
  for (let j = 0; j < 6; j++) {
    await sleep(500);
    popupVisible = await page.evaluate(() => {
      const tippy = document.querySelector('.tippy-box');
      return tippy && tippy.querySelectorAll('.item').length > 0;
    });
    if (popupVisible) break;
  }
  
  const clicked = await page.evaluate((t) => {
    const tippyBox = document.querySelector('.tippy-box');
    for (const item of tippyBox.querySelectorAll('.item')) {
      const text = item.innerText.trim().split('\n')[0].replace(/^#/, '');
      if (text === t || text.startsWith(t)) {
        item.click();
        return { success: true };
      }
    }
    return { success: false };
  }, tag);
  
  // 3. 回退：Enter 选择第一个
  if (!clicked.success) await page.keyboard.press('Enter');
  
  // 4. 输入空格分隔
  await page.keyboard.type(' ', { delay: 50 });
  await sleep(500);
}
```

**验证方法：**
```javascript
const blueCount = await page.evaluate(() => {
  const editor = document.querySelector('.tiptap, .ProseMirror');
  return editor.querySelectorAll('a.tiptap-topic').length;
});
// blueCount === 6 表示全部变蓝
```

### 发布按钮技术方案

**发现：** 发布按钮封装在自定义 Web Component `<XHS-PUBLISH-BTN>` 中，Shadow DOM 为 closed 模式，无法穿透访问内部按钮元素。

**成功方法：点击自定义元素容器本身**
```javascript
const customEl = await page.$('xhs-publish-btn, XHS-PUBLISH-BTN');
if (!customEl) throw new Error('未找到发布按钮容器');

const rect = await customEl.evaluate(el => el.getBoundingClientRect());
const clickX = rect.x + rect.width * 0.65;  // 右侧 65%（发布按钮位置）
const clickY = rect.y + rect.height / 2;     // 垂直居中

await page.mouse.click(clickX, clickY);
```

**坐标参考：** 容器 x=438, y=779, w=864, h=90 → 点击 (1000, 824)

**发布前准备：**
```javascript
// 1. 滚动内容容器到底部
await page.evaluate(() => {
  const c = document.querySelector('.publish-page-content');
  if (c) c.scrollTop = c.scrollHeight;
});
await sleep(1000);

// 2. 关闭可能的弹窗
await page.keyboard.press('Escape');
await sleep(300);
await page.keyboard.press('Escape');
await sleep(300);
```

**发布成功验证：**
- URL 变为 `https://creator.xiaohongshu.com/publish/publish?source=&published=true`
- 页面跳转到空白上传页
- 笔记管理页新增一条笔记（状态：审核中）

### 位置（POI）输入（v1.10 修复版）

⚠️ **v1.9 核心修复：点击无法打开位置弹窗，必须用 Enter 键！**
⚠️ **v1.10 核心修复：点击 `.option-name` 选中位置，无需关闭弹窗即可发布！**

- **滚动**：`document.querySelector('.address-card-select').scrollIntoView({ behavior: 'instant', block: 'center' })`
- **打开弹窗**：`addr.tabIndex = 0` → `addr.focus()` → **`page.keyboard.press('Enter')`**（⚠️ 任何点击方法均无效，Enter 键才是触发方式）
- **搜索输入**：弹窗打开后直接 `page.keyboard.type('锦湖电脑数码城', { delay: 80 })`（键盘输入自动进入搜索框）
- **选择结果**：**点击 `.option-name` 元素**（不是 `.option-item`）→ `page.mouse.click(nameRect.x + nameRect.w/2, nameRect.y + nameRect.h/2)`
  - ⚠️ `.option-name` 是显示地名的文字元素（如"锦湖电脑数码城"），点击它能正确绑定 POI 数据
  - ❌ `.option-item` 是整个选项块，点击后虽然文字会显示但 POI 数据未绑定，发布后位置不显示
- **关闭弹窗**：无需强制关闭弹窗，发布按钮点击不受影响（Escape 可能无法关闭弹窗，但不影响发布）
- **验证**：`.address-card-select` 的 textContent 从"添加地点"变为具体地址名

**根因**：小红书的 `d-select` 组件（Vue 实现）的位置选择器依赖键盘事件触发 popover（v1.9），选中时必须点击 `.option-name` 文字元素才能正确绑定 POI 数据（v1.10），点击外层 `.option-item` 只会显示文字但不绑定 POI，导致发布后位置不显示。

### 话题规则

- 每次发布 **6 个话题**
- **必须包含**：`#南阳嗨舞` + `#南阳嗨舞工作室`
- 其余 4 个从主人发的截图提取或模仿风格
- 不加默认话题，只使用主人指定的标签

### 📋 主人规则（必须遵守）

1. **🚫 绝不压缩视频画质** - 保留原文件，不做任何压缩处理
2. **🚫 发布前必须经主人确认** - 填写完成后截图给主人检查，同意后才发布
3. **🚫 不加默认话题** - 只使用主人指定的话题标签
4. **📝 正文只填话题** - 正文区域只填写话题标签，不写其他文案内容
5. **📸 截图确认全图** - `page.screenshot({ fullPage: true })`，标题/话题/位置/发布按钮全部可见
5. **📝 两阶段模式** - 先填写（-s）→ 确认 → 再发布（-p），不重复输入
6. **🔒 未经主人同意，绝不擅自发布**
7. **🛡️ Cookie 保护是第一位的** - 失败一次就停手汇报，严禁反复启动 Chrome
8. **⚠️ 流程中任何一步失败 → 立刻停手 → 汇报 → 等主人决定** - 不要自己判断继续
9. **🚫 绝不擅自修改脚本配置** - 发现脚本参数、选择器、流程逻辑有问题时，不自行修改代码，先汇报给主人
10. **📄 SKILL.md 只同步最新版本内容** - 旧版本记录自动删除，保持文档简洁；修复经验记录只保留最新 1-2 条
11. **📍 页面检查** - 执行发布流程时，如果发现页面不在上传页，先自动导航到发布页再执行
12. **🔵 话题必须逐个输入变蓝** - 不能一次性注入所有话题，必须用 `execCommand('insertText')` 逐个触发弹窗选择才能转换为蓝色链接（v1.3）
13. **📝 标题+正文规则** - 标题填写嗨舞版标题，正文只填话题标签，不写其他文案（v1.2）
14. **🔵 话题输入必须用 execCommand** - `page.keyboard.type()` 和 CDP 均无法触发 TipTap 话题解析器，必须用 `execCommand('insertText')` 插入 `#话题`（v1.3）
15. **📍 位置选择必须用 Enter 键** - `.address-card-select` 点击无效，必须 `focus()` + `Enter` 键触发 popover 打开（v1.9 修复）
16. **📍 位置必须点击 `.option-name`** - 点击 `.option-item` 只显示文字不绑定 POI，必须点击 `.option-name` 文字元素才能正确绑定 POI 数据（v1.10 修复）

## 修复经验总结

### 每次修复后的标准流程
1. 修复完成后，向主人汇报：修复内容 + 根本原因 + 验证结果
2. **主动询问主人是否要将本次经验记录进本 SKILL.md**
3. 主人同意后，在下方「经验记录」中添加一条新记录
4. 记录格式：日期 | 问题简述 | 根因 | 修复方案 | 教训

### 经验记录

#### 2026-05-26 | v1.15 - 修复原创声明开关点击 + 状态检测 ✅
- **现象1**：v1.14 脚本点击原创声明开关后未成功开启，日志显示"已点击"但实际开关未变。
- **根因1**：脚本选择器 `'[class*="switch"]'` 匹配到了 `.custom-switch-wrapper`（整个容器，包含文字区域），而不是 `.d-switch`（真正的开关控件）。点击容器中心时点到了左侧文字，没有触发开关。
- **修复方案1**：改为先定位 `.original-wrapper`，再找内部的 `.d-switch` 元素，用 `page.mouse.click()` 精准点击开关中心坐标。
- **现象2**：v1.15 初次修复后状态检测显示"已开启，跳过"，但实际开关未开启。
- **根因2**：`"unchecked".includes("checked") === true`，JavaScript 字符串包含匹配导致误判。
- **修复方案2**：状态检测改为 `(className.includes('checked ') || className.endsWith('checked')) && !className.includes('unchecked')`，精确匹配且排除 unchecked。
- **核心教训**：① 自定义开关组件需要精准定位内部子元素，不能只匹配外层容器；② 字符串 contains/includes 检测状态时注意前缀/后缀匹配，避免部分字符串误判。

---

#### 2026-05-26 | v1.14 - 新增原创声明步骤 ✅
- **现象**：发布时没有开启原创声明，无法获得原创笔记标记和平台保护。
- **根因**：发布流程中没有包含开启原创声明的步骤。
- **修复方案**：v1.14 ① 发布流程新增 Step 3.6 开启原创声明步骤；② 滚动到内容设置区域 → 点击"原创声明"开关 → 弹窗中勾选"我已阅读并同意" → 点击"声明原创"按钮；③ 确认开关变为开启状态（红色）。
- **核心教训**：原创声明开关在内容设置区域，点击后会弹出确认弹窗，需要先勾选同意再点声明原创。弹窗内的复选框和按钮可能在 modal 层级，需要精准定位。

---

#### 2026-05-25 | 话题数量上限 10 个 ✅
- **现象**：表单填写完成（标题、12 个话题、位置、视频都已填好），但点击发布按钮无反应，手动点击也无效。排查了 20+ 种点击方式均失败。
- **根因**：小红书话题数量上限为 **10 个**，填写 12 个话题导致表单验证失败，发布按钮不响应。与点击方式无关，是表单数据不合法。
- **核心教训**：每次填写话题时，**最多只能填 10 个**（包含 #南阳嗨舞 + #南阳嗨舞工作室 + 8 个其他话题）。超过 10 个会导致发布按钮失效。

---

#### 2026-05-24 | 生成标题前必须 memory_search 往期标题风格 ✅
- **现象**：生成小红书标题时，没有参考往期标题格式，直接按截图风格生成，主人指出格式不对。
- **根因**：跳过了 SKILL.md 中明确写着的「⚠️ 必须先 memory_search 搜索往期小红书标题风格」这一步骤，没有先搜索往期标题格式就直接生成了。
- **核心教训**：每次生成小红书标题前，必须先 `memory_search` 搜索往期小红书标题（搜索关键词："小红书标题 发布 历史 往期"），分析往期标题格式（如：歌名 | 一句话感受 + emoji），结合截图风格生成。禁止跳过往期标题直接生成。

---

#### 2026-05-22 | v1.10 - 位置 POI 数据绑定修复 ✅
- **现象**：位置选择后文字显示"锦湖电脑数码城"，但发布后位置不显示。
- **根因**：点击 `.option-item`（整个选项块）只会更新显示文字，不会触发 Vue 组件的 POI 数据绑定。必须点击 `.option-name`（地名文字元素）才能正确绑定 POI 数据到发布表单。
- **修复方案**：搜索关键词后，在 `.d-popover` 中找 `.option-name` 元素 → 计算中心坐标 → `page.mouse.click()` 点击。
- **核心教训**：Vue 组件的事件绑定可能在特定子元素上，不是父元素；点击后需要验证数据是否真正绑定（不只是看显示文字）。

---

#### 2026-05-22 | v1.9 - 位置选择器 Enter 键修复 ✅
- **现象**：`.address-card-select` 点击后 popover 始终不打开（`display: none`，`0x0` 像素），尝试了 15+ 种点击方法（`page.mouse.click`、`page.mouse.down/up`、`MouseEvent` dispatchEvent、`PointerEvent` dispatchEvent、`element.click()`、CDP `Input.dispatchMouseEvent`、MutationObserver 监听等）均失败。
- **根因**：小红书的 `d-select` 组件（Vue 实现，`data-v-2710ae6d`）的位置选择器依赖**键盘 Enter 键**触发 popover 打开，所有点击事件都被 Vue 组件拦截。元素上有 `tabIndex` 属性，需要聚焦后按 Enter 才能触发下拉。
- **修复方案**：① `scrollIntoView({ block: 'center' })` 滚动到视口；② `addr.tabIndex = 0` + `addr.focus()` 聚焦；③ **`page.keyboard.press('Enter')`** 打开弹窗；④ 直接 `keyboard.type()` 输入搜索词（自动进入搜索框）；⑤ 找结果点击或 `ArrowDown` + `Enter` 选择。
- **核心教训**：Vue 组件的 select/dropdown 可能不响应点击事件，需要用键盘事件（Enter/Space）触发；不要盲目尝试更多点击方法，要分析组件的触发机制。

---

#### 2026-05-15 | v1.1 - 发布按钮发现 + 话题变蓝方案 ✅
- **现象**：发布按钮用常规 DOM 查询找不到；话题一次性输入后变成黑色普通文字。
- **根因**：
  1. 发布按钮封装在自定义 Web Component `<XHS-PUBLISH-BTN>` 中，Shadow DOM 为 closed 模式，无法穿透。
  2. TipTap 富文本编辑器需要触发 hashtag 解析器才能将 `#话题` 转换为蓝色链接，一次性注入的文本不会触发解析。
- **修复方案**：
  1. **发布按钮**：找到 `<XHS-PUBLISH-BTN>` 自定义元素 → 计算坐标 → `page.mouse.click(rect.x + rect.width * 0.65, rect.y + rect.height / 2)`。
  2. **话题变蓝**：逐个输入 `#话题名` → 等待 2 秒弹窗 → 点击 `.item` 匹配项 → 输入空格分隔 → 循环处理。
- **核心教训**：
  - **自定义 Web Component 无法用常规 DOM 查询穿透**，但可以获取元素本身并计算坐标点击。
  - **话题变蓝必须逐个触发**，不能一次性注入。
- **脚本路径**：`scripts/xhs_auto_publish.js`

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.15 | 2026-05-26 | **修复原创声明开关点击 + 状态检测**：① 点击目标从 `.custom-switch-wrapper`（容器）改为 `.d-switch`（真实开关），避免点到文字区域；② 状态检测修复 `"unchecked".includes("checked")` 误判，改为精确匹配；③ 增加 `page.mouse.click()` 坐标点击替代 `dispatchEvent` ✅ |
| v1.14 | 2026-05-26 | **新增原创声明步骤**：① 发布流程中新增开启原创声明步骤；② 点击开关 → 勾选同意 → 点击"声明原创"按钮；③ 确认开关变为开启状态（红色）✅ |
| v1.13 | 2026-05-26 | **截图规则明确化**：① 确认截图明确使用 `fullPage: true` 全图截图，不可用 clip 裁剪；② 与抖音 v1.35 截图规则保持一致 ✅ |
| v1.12 | 2026-05-25 | **话题数量上限 10 个**：① 小红书话题最多填 10 个，超过会导致表单验证失败、发布按钮不响应；② 与点击方式无关，是表单数据不合法 ✅ |
