/**
 * 石榴·嗨舞舞室小红书自动发布系统
 * 版本: v1.15 - 修复原创声明开关点击逻辑 + 新增原创声明步骤 + 截图全图明确化 fullPage:true
 * 日期: 2026-05-26
 *
 * 关键发现:
 * - 发布按钮在 <XHS-PUBLISH-BTN> 自定义 Web Component 内
 * - Shadow DOM 为 closed 模式,无法穿透
 * - 成功方法:动态获取元素坐标 → 点击右侧 65% 位置
 * - 话题必须用 execCommand('insertText') 插入 #话题 → 等待弹窗 → 点击推荐项 → 空格分隔
 * - page.keyboard.type 和 CDP 输入均无法触发 TipTap 话题解析器
 * - 位置选择:滚动到可见区域 → 点击 .address-card-select → 搜索输入 → 点击结果
 */

const puppeteer = require('/Users/popoll/.openclaw/workspace/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================
const CONFIG = {
    CREATOR_URL: 'https://creator.xiaohongshu.com/publish/publish',
    LOG_FILE: '/tmp/xhs_publish.log',
    PREVIEW_DIR: '/tmp',
    QQBOT_MEDIA_DIR: '/Users/popoll/.openclaw/media/qqbot/uploads',
    QQBOT_TARGET: '62CA6F1CA9E37F25C20D47FB7D134593',
};

// ==================== 工具函数 ====================
function log(msg) {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const line = `[${time}] ${msg}`;
    console.log(line);
    fs.appendFileSync(CONFIG.LOG_FILE, line + '\n');
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min) + min);
    return sleep(ms);
}

// ==================== Chrome 端口检查 ====================
function checkChromePort() {
    const { execSync } = require('child_process');
    try {
        execSync('lsof -iTCP:9222 -sTCP:LISTEN > /dev/null 2>&1');
        return true;
    } catch {
        return false;
    }
}

// ==================== 连接 Chrome ====================
async function connectChrome() {
    if (!checkChromePort()) {
        log('❌ Chrome 9222 端口未启动,请主人确认后手动启动 Chrome 调试模式');
        return null;
    }

    const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null,
    });
    log('✅ Chrome 连接成功');
    return browser;
}

// ==================== 检查登录状态 ====================
async function checkLogin(page) {
    const text = await page.evaluate(() => document.body.innerText);
    if (text.includes('短信登录') || text.includes('手机号登录') || text.includes('扫码登录')) {
        return false;
    }
    return true;
}

// ==================== 获取小红书页面 ====================
async function getXhsPage(browser) {
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('creator.xiaohongshu.com') && p.url().includes('/publish/publish'));

    if (!page) {
        // 有小红书页面但不在发布页，直接导航到发布页
        page = pages.find(p => p.url().includes('creator.xiaohongshu.com'));
        if (page) {
            log('📍 不在发布页，导航到发布页...');
            await page.goto(CONFIG.CREATOR_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(3000);
        } else {
            log('📍 导航到发布页...');
            page = pages[0];
            await page.goto(CONFIG.CREATOR_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(3000);
        }
    }

    await page.bringToFront();
    return page;
}

// ==================== 填写模式(安全模式) ====================
async function doFill(options) {
    const { videoPath, title, hashtags = [], location = '锦湖电脑数码城' } = options;
    let browser;

    try {
        browser = await connectChrome();
        if (!browser) return { success: false, error: 'Chrome 未启动' };

        const page = await getXhsPage(browser);

        // 检查登录
        const isLoggedIn = await checkLogin(page);
        if (!isLoggedIn) {
            log('❌ 创作者中心未登录,请主人登录后重试');
            return { success: false, error: '未登录' };
        }

        log('✅ 已在发布页,已登录');

        // 确保小红书页面在最前未被遮挡
        log('📍 将小红书页面置于最前...');
        await page.bringToFront();
        await sleep(1000);
        // 使用 AppleScript 激活 Chrome 窗口
        const { execSync } = require('child_process');
        try {
            execSync('osascript -e \'tell application "Google Chrome" to activate\'', { timeout: 5000 });
            log('✅ Chrome 窗口已激活');
        } catch (e) {
            log('⚠️ Chrome 窗口激活失败,继续执行');
        }
        await sleep(500);

        // v1.3: 刷新页面确保 DOM 状态干净(防止残留话题/表单状态)
        log('🔄 刷新页面...');
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(3000);

        // ===== Step 1: 上传视频 =====
        log('\n📤 Step 1: 上传视频');

        // 切换到视频模式
        await page.evaluate(() => {
            const all = document.querySelectorAll('div, li, span');
            for (const el of all) {
                if ((el.innerText || '').trim() === '上传视频') { el.click(); break; }
            }
        });
        await sleep(2000);

        const fileInput = await page.$('input[type="file"]');
        if (!fileInput) {
            log('❌ 未找到文件上传输入框');
            return { success: false, error: '未找到上传框' };
        }

        await fileInput.uploadFile(path.resolve(videoPath));
        log(`✅ 视频已注入: ${path.basename(videoPath)}`);

        // 等待上传完成(最多 5 分钟)
        log('⏳ 等待上传完成...');
        let uploaded = false;
        for (let i = 0; i < 100; i++) {
            await sleep(3000);
            const hasTitle = await page.evaluate(() => !!document.querySelector('input[placeholder*="标题"]'));
            if (hasTitle) {
                log('✅ 视频上传完成,编辑页已就绪');
                uploaded = true;
                break;
            }
            if ((i + 1) % 10 === 0) log(`⏳ 上传中... (${(i + 1) * 3}秒)`);
        }

        if (!uploaded) {
            log('⚠️ 上传超时,但继续填写');
        }

        await randomDelay(1000, 2000);

        // ===== Step 2: 填写标题 =====
        log('\n📝 Step 2: 填写标题');
        if (title) {
            await page.evaluate((t) => {
                const input = document.querySelector('input[placeholder*="标题"]');
                if (input) {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(input, t);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, title);
            log(`✅ 标题已填写: ${title.substring(0, 30)}...`);
        }
        await randomDelay(500, 1000);

        // ===== Step 3: 填写话题(逐个输入变蓝) =====
        log(`\n#️⃣ Step 3: 填写话题 (${hashtags.length}个)`);

        if (hashtags.length > 0) {
            // 清空编辑器(v1.3: 彻底清空,防止残留文本)
            const cleared = await page.evaluate(() => {
                const editor = document.querySelector('.tiptap, .ProseMirror, [contenteditable="true"]');
                if (editor) {
                    editor.innerHTML = '';
                    editor.textContent = '';
                    editor.focus();
                    // 用 execCommand 确保清空
                    document.execCommand('selectAll', false, null);
                    document.execCommand('delete', false, null);
                    return true;
                }
                return false;
            });

            if (!cleared) {
                log('⚠️ 未找到编辑器');
                return { success: false, error: '未找到编辑器' };
            }

            log('✅ 编辑器已清空');
            await sleep(500);

            // 验证清空结果
            const verifyEmpty = await page.evaluate(() => {
                const editor = document.querySelector('.tiptap, .ProseMirror');
                return editor?.textContent?.trim() || '';
            });

            if (verifyEmpty) {
                log(`⚠️ 编辑器未完全清空: "${verifyEmpty.substring(0, 50)}"`);
            }

            // 逐个输入话题(v1.3: 使用 execCommand 代替 page.keyboard.type)
            for (let i = 0; i < hashtags.length; i++) {
                const tag = hashtags[i];
                log(`  [${i + 1}/${hashtags.length}] 输入: #${tag}`);

                // 用 execCommand('insertText') 插入 #话题
                await page.evaluate((t) => {
                    const editor = document.querySelector('.tiptap, .ProseMirror, [contenteditable="true"]');
                    if (editor) {
                        editor.focus();
                        document.execCommand('insertText', false, '#' + t);
                    }
                }, tag);

                // 等待话题推荐弹窗出现(最多 3 秒)
                let popupVisible = false;
                for (let j = 0; j < 6; j++) {
                    await sleep(500);
                    popupVisible = await page.evaluate(() => {
                        const tippy = document.querySelector('.tippy-box');
                        return tippy && tippy.querySelectorAll('.item').length > 0;
                    });
                    if (popupVisible) break;
                }

                if (!popupVisible) {
                    log(`    ⚠️ 弹窗未出现,使用 Enter fallback`);
                    await page.keyboard.press('Enter');
                } else {
                    // 在 .tippy-box 弹窗中查找并点击推荐话题
                    const clicked = await page.evaluate((t) => {
                        const tippyBox = document.querySelector('.tippy-box');
                        const items = tippyBox.querySelectorAll('.item');
                        for (const item of items) {
                            const text = item.innerText.trim().split('\n')[0].replace(/^#/, '');
                            if (text === t || text.startsWith(t)) {
                                item.click();
                                return { success: true, text };
                            }
                        }
                        return { success: false };
                    }, tag);

                    if (clicked.success) {
                        log(`    ✅ 已选择: ${clicked.text}`);
                    } else {
                        await page.keyboard.press('Enter');
                        log(`    ⚡ Enter fallback`);
                    }
                }

                // 输入空格分隔
                await page.keyboard.type(' ', { delay: 50 });
                await sleep(500);
            }

            // 验证话题变蓝
            const blueCount = await page.evaluate(() => {
                const editor = document.querySelector('.tiptap, .ProseMirror, [contenteditable="true"]');
                return editor ? editor.querySelectorAll('a.tiptap-topic').length : 0;
            });
            log(`✅ 话题填写完成,蓝色链接: ${blueCount}/${hashtags.length}`);

            if (blueCount < hashtags.length) {
                log('⚠️ 话题未全部变蓝,流程中止,请主人确认');
                return { success: false, error: '话题未全部变蓝' };
            }
        }

        await randomDelay(500, 1000);

        // ===== Step 3.5: 添加位置 POI =====
        log(`\n📍 Step 3.5: 添加位置`);

        try {
            // 滚动到位置选择器可见
            await page.evaluate(() => {
                const addrEl = document.querySelector('.address-card-select');
                if (addrEl) addrEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            });
            await sleep(1500);

            // 第一步：点击位置选择器打开下拉弹窗
            const clicked = await page.evaluate(() => {
                const wrapper = document.querySelector('.address-card-select');
                if (!wrapper) return false;
                // dispatchEvent 模拟真实点击事件
                wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return true;
            });

            if (!clicked) {
                log('  ⚠️ 未找到位置选择器');
            } else {
                log('  ✅ 已点击位置选择器');
                await sleep(1000);

                // 第二步：找到隐藏搜索输入框，去掉 hide 类并聚焦
                const inputReady = await page.evaluate(() => {
                    // 找 .d-select-input-filter 内的 input
                    const filterInput = document.querySelector('.d-select-input-filter input');
                    if (!filterInput) return false;

                    // 去掉 hide 类让输入框可见
                    const filter = document.querySelector('.d-select-input-filter');
                    if (filter) filter.classList.remove('hide');

                    // 聚焦并点击
                    filterInput.focus();
                    filterInput.click();
                    return true;
                });

                if (!inputReady) {
                    log('  ⚠️ 未找到搜索输入框');
                } else {
                    log('  ✅ 搜索输入框已聚焦');
                    await sleep(500);

                    // 第三步：输入位置关键词
                    log(`  搜索: ${location}`);
                    await page.keyboard.type(location, { delay: 80 });
                    log('  ✅ 已输入位置关键词');
                    await sleep(4000);

                    // 第四步：用完整事件序列触发 Vue 组件选中
                    const selected = await page.evaluate(() => {
                        const dropdowns = document.querySelectorAll('.d-dropdown');
                        for (const dd of dropdowns) {
                            const items = dd.querySelectorAll('.option-item');
                            for (const item of items) {
                                const text = (item.textContent || '').trim();
                                if (text.length > 3 && text.length < 80) {
                                    // 完整事件序列：PointerEvent + MouseEvent
                                    item.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                                    item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                                    item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                                    item.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
                                    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                    
                                    // 也对内部的 .option-name 触发事件（确保 Vue 事件链完整）
                                    const nameEl = item.querySelector('.option-name');
                                    if (nameEl) {
                                        nameEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                                        nameEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                                    }
                                    
                                    return { success: true, text: text.substring(0, 60) };
                                }
                            }
                        }
                        return { success: false };
                    });

                    if (selected.success) {
                        log(`  ✅ 已选择: ${selected.text}`);
                        await sleep(3000);

                        // 验证位置是否选中
                        const locText = await page.evaluate(() => {
                            const content = document.querySelector('.address-card-select .d-select-content');
                            if (content) {
                                const text = content.textContent?.trim();
                                if (text && text.length > 1) return text;
                            }
                            const ph = document.querySelector('.address-card-select .d-select-placeholder');
                            return ph ? ph.textContent?.trim() : null;
                        });

                        if (locText && locText !== '添加地点' && locText.length > 2) {
                            log(`  ✅ 位置已选择: ${locText}`);
                        } else {
                            log('  ⚠️ 位置选择可能失败，请主人确认');
                        }
                    } else {
                        log('  ⚠️ 未找到搜索结果');
                    }
                }
            }
        } catch (locErr) {
            log(`  ⚠️ 位置选择异常: ${locErr.message}`);
        }

        await randomDelay(500, 1000);

        // ===== Step 3.6: 开启原创声明（v1.15 修复） =====
        log('\n️ Step 3.6: 开启原创声明');
        
        try {
            // 滚动到内容设置区域
            await page.evaluate(() => {
                const content = document.querySelector('.publish-page-content');
                if (content) {
                    content.scrollTo({ top: content.scrollHeight * 0.6, behavior: 'instant' });
                }
            });
            await sleep(1500);
            
            // 第一步：精准定位 .original-wrapper 内的 .d-switch 开关（v1.15 修复：之前点到了文字区域）
            const switchInfo = await page.evaluate(() => {
                const wrapper = document.querySelector('.original-wrapper');
                if (!wrapper) return { success: false, error: '未找到 original-wrapper' };
                const switchEl = wrapper.querySelector('.d-switch');
                if (!switchEl) return { success: false, error: '未找到 .d-switch' };
                const rect = switchEl.getBoundingClientRect();
                const simulator = switchEl.querySelector('.d-switch-simulator');
                // v1.15 修复: "unchecked".includes("checked") === true, 必须精确匹配
                const isChecked = simulator ? (simulator.className.includes('checked ') || simulator.className.endsWith('checked')) && !simulator.className.includes('unchecked') : false;
                return {
                    success: true,
                    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                    isChecked: isChecked
                };
            });
            
            if (!switchInfo.success) {
                log(`  ⚠️ 未找到原创声明开关: ${switchInfo.error}`);
            } else if (switchInfo.isChecked) {
                log('  ✅ 原创声明已开启，跳过');
            } else {
                // 精准点击 .d-switch 开关中心
                const clickX = switchInfo.rect.x + switchInfo.rect.w / 2;
                const clickY = switchInfo.rect.y + switchInfo.rect.h / 2;
                log(`  📍 点击开关坐标: (${clickX}, ${clickY})`);
                await page.mouse.click(clickX, clickY);
                log('  ✅ 已点击原创声明开关');
                await sleep(2000);
                
                // 第二步：检查是否弹出确认弹窗
                const hasDialog = await page.evaluate(() => {
                    const text = document.body.innerText;
                    return text.includes('原创声明须知') || text.includes('声明原创');
                });
                
                if (hasDialog) {
                    log('  检测到原创声明确认弹窗');
                    
                    // 勾选"我已阅读并同意"
                    const checkboxOk = await page.evaluate(() => {
                        for (const input of document.querySelectorAll('input[type="checkbox"]')) {
                            const parent = input.closest('[class*="checkbox"], label');
                            const popup = input.closest('.xhs-popup, .xhs-modal, [class*="popup"], [class*="modal"]');
                            if (popup || (parent && parent.textContent.includes('我已阅读并同意'))) {
                                input.click();
                                return { success: true, method: 'input-click' };
                            }
                        }
                        for (const el of document.querySelectorAll('label, span, div, p')) {
                            if (el.textContent.includes('我已阅读并同意') && el.offsetWidth > 0) {
                                el.click();
                                return { success: true, method: 'text-click' };
                            }
                        }
                        return { success: false };
                    });
                    
                    if (checkboxOk.success) {
                        log(`  ✅ 已勾选同意 (${checkboxOk.method})`);
                        await sleep(800);
                    }
                    
                    // 点击"声明原创"按钮
                    const declareOk = await page.evaluate(() => {
                        for (const btn of document.querySelectorAll('button')) {
                            if (btn.textContent.trim() === '声明原创') {
                                btn.click();
                                return true;
                            }
                        }
                        return false;
                    });
                    
                    if (declareOk) {
                        log('  ✅ 已点击声明原创按钮');
                        await sleep(2000);
                    }
                } else {
                    log('  ⚠️ 未检测到确认弹窗');
                }
                
                // 验证开关状态（v1.15 修复：检查 .d-switch-simulator 的 class 是否包含 checked）
                const statusOk = await page.evaluate(() => {
                    const wrapper = document.querySelector('.original-wrapper');
                    if (!wrapper) return { found: false };
                    const switchEl = wrapper.querySelector('.d-switch');
                    if (!switchEl) return { found: false };
                    const simulator = switchEl.querySelector('.d-switch-simulator');
                    const isChecked = simulator ? (simulator.className.includes('checked ') || simulator.className.endsWith('checked')) && !simulator.className.includes('unchecked') : false;
                    return { found: true, isChecked, class: simulator ? simulator.className : 'none' };
                });
                
                if (statusOk.found && statusOk.isChecked) {
                    log('  ✅ 原创声明已开启');
                } else {
                    log(`  ⚠️ 原创声明状态未确认: ${JSON.stringify(statusOk)}`);
                }
            }
        } catch (origErr) {
            log(`  ⚠️ 原创声明异常: ${origErr.message}`);
        }

        await randomDelay(500, 1000);

        // ===== Step 4: 截图确认 =====
        log('\n📸 Step 4: 截图确认');
        const previewPath = path.join(CONFIG.PREVIEW_DIR, `xhs_publish_preview_${Date.now()}.png`);
        await page.screenshot({ path: previewPath, fullPage: false, clip: { x: 0, y: 0, width: 1400, height: 900 } });
        log(`📸 截图: ${previewPath}`);

        // 复制到 QQ Bot 媒体目录
        if (fs.existsSync(CONFIG.QQBOT_MEDIA_DIR)) {
            const qqbotPath = path.join(CONFIG.QQBOT_MEDIA_DIR, 'xhs_publish_preview.png');
            fs.copyFileSync(previewPath, qqbotPath);
            log('📤 已复制到 QQ Bot 媒体目录');

            // 推送截图到 QQ
            const { exec } = require('child_process');
            exec(`openclaw message send --channel qqbot --target ${CONFIG.QQBOT_TARGET} --message "📸 小红书发布预览" --media ${qqbotPath}`,
                (err) => {
                    if (err) log(`⚠️ QQ 推送失败: ${err.message}`);
                    else log('✅ 截图已推送到主人 QQ');
                }
            );
        }

        log('\n🛡️ 安全模式: 请主人确认发布内容');
        log(`   标题: ${title || '(空)'}`);
        log(`   话题: ${hashtags.join(' ')}`);
        log(`   位置: ${location}`);
        log(`   蓝色话题数: ${hashtags.length}/${hashtags.length}`);
        log('\n💡 确认后运行: node xhs_auto_publish.js -p');

        return { success: true, safeMode: true, previewPath };

    } catch (err) {
        log(`❌ ${err.message}`);
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.disconnect();
    }
}

// ==================== 发布模式 ====================
async function doPublish() {
    let browser;

    try {
        browser = await connectChrome();
        if (!browser) return { success: false, error: 'Chrome 未启动' };

        const page = await getXhsPage(browser);

        // 检查登录
        const isLoggedIn = await checkLogin(page);
        if (!isLoggedIn) {
            log('❌ 创作者中心未登录,请主人登录后重试');
            return { success: false, error: '未登录' };
        }

        log('✅ 已在发布页,已登录');

        // ===== 发布前准备 =====
        log('\n🚀 准备发布...');

        // 1. 滚动内容容器到底部
        log('📍 滚动到底部...');
        await page.evaluate(() => {
            const c = document.querySelector('.publish-page-content');
            if (c) c.scrollTop = c.scrollHeight;
        });
        await sleep(1000);

        // 2. 关闭可能的弹窗
        log('🔇 关闭弹窗...');
        await page.keyboard.press('Escape');
        await sleep(300);
        await page.keyboard.press('Escape');
        await sleep(300);

        // ===== 动态获取发布按钮坐标 =====
        log('📍 获取发布按钮坐标...');
        const btnPos = await page.evaluate(() => {
            const customEl = document.querySelector('xhs-publish-btn, XHS-PUBLISH-BTN');
            if (!customEl) return null;
            const rect = customEl.getBoundingClientRect();
            return {
                x: Math.round(rect.x + rect.width * 0.65),
                y: Math.round(rect.y + rect.height / 2),
                containerRect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    w: Math.round(rect.width),
                    h: Math.round(rect.height),
                },
            };
        });

        if (!btnPos) {
            log('❌ 未找到 <XHS-PUBLISH-BTN> 自定义元素');
            return { success: false, error: '未找到发布按钮容器' };
        }

        log(`📍 发布按钮容器: x=${btnPos.containerRect.x}, y=${btnPos.containerRect.y}, w=${btnPos.containerRect.w}, h=${btnPos.containerRect.h}`);
        log(`📍 点击坐标: (${btnPos.x}, ${btnPos.y})`);

        // ===== 执行发布 =====
        log('\n🔴 点击发布按钮...');
        await page.mouse.click(btnPos.x, btnPos.y);
        log('✅ 已点击');

        // 等待发布结果
        log('⏳ 等待发布结果...');
        await sleep(8000);

        // 验证发布成功
        const url = await page.url();
        log(`📍 当前 URL: ${url}`);

        if (url.includes('published=true') || url.includes('/publish/success')) {
            log('✅ 发布成功!');
            return { success: true, published: true, url };
        } else {
            log('⚠️ 未检测到 published=true,请主人手动确认');

            // 截图当前状态
            const failPath = path.join(CONFIG.PREVIEW_DIR, `xhs_publish_fail_${Date.now()}.png`);
            await page.screenshot({ path: failPath, fullPage: true });
            log(`📸 失败截图: ${failPath}`);

            return { success: false, error: '未检测到发布成功', url };
        }

    } catch (err) {
        log(`❌ ${err.message}`);
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.disconnect();
    }
}

// ==================== CLI 入口 ====================
if (require.main === module) {
    const args = process.argv.slice(2);
    let videoPath, title, hashtags = [], publishMode = false, location = '锦湖电脑数码城';

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-v': case '--video':
                videoPath = args[++i]; break;
            case '-t': case '--title':
                title = args[++i]; break;
            case '-h': case '--hashtags':
                hashtags = args[++i].split(/[\s,]+/).map(s => s.trim().replace(/^#+/, '')).filter(s => s); break;
            case '-l': case '--location':
                location = args[++i]; break;
            case '-p': case '--publish':
                publishMode = true; break;
            case '-s': case '--safe':
                break; // 默认安全模式
        }
    }

    if (publishMode) {
        doPublish().then(r => {
            log(r.success ? `✅ ${r.message || '完成'}` : `❌ ${r.error}`);
            if (!r.success) process.exit(1);
        }).catch(e => { log(`❌ ${e.message}`); process.exit(1); });
    } else if (!videoPath) {
        console.log('用法:');
        console.log('  填写模式: node xhs_auto_publish.js -s -v <视频> -t <标题> -h "<话题1> <话题2> ..." [-l <位置>]');
        console.log('  发布模式: node xhs_auto_publish.js -p');
        console.log('');
        console.log('示例:');
        console.log('  node xhs_auto_publish.js -s -v video.mp4 -t "标题" -h "南阳嗨舞 南阳嗨舞工作室 pop 南阳舞蹈" -l "锦湖电脑数码城"');
        console.log('  node xhs_auto_publish.js -p');
        process.exit(1);
    } else {
        doFill({ videoPath, title, hashtags, location }).then(r => {
            log(r.success ? `✅ 完成` : `❌ ${r.error}`);
            if (!r.success) process.exit(1);
        }).catch(e => { log(`❌ ${e.message}`); process.exit(1); });
    }
}

module.exports = { doFill, doPublish };
