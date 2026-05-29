/**
 * 石榴·嗨舞舞室抖音自动发布脚本
 * 版本：v1.36 - 位置选择精准修复，通过内容特征定位弹窗 + 面积排序选最小结果项 (2026-05-26)
 * 关键方法:
 *   描述: execCommand('delete') + execCommand('insertText') 一次性注入纯描述（不带话题）
 *   话题: CDP insertText 输入 #话题 → 等弹窗 → ArrowDown+Enter 选择推荐 → 空格分隔 ✅
 *   位置: 通过文本内容精准定位搜索结果弹窗 → 按面积排序选最小匹配元素精准点击 → 键盘回退兜底 ✅
 * 
 * 使用方式：
 *   1. 填写模式（安全模式）: node douyin_auto_publish.js -s -v <视频> -t <标题> [-d <描述>] [-h <话题>] [-l <位置>]
 *      → 填写表单 → 截图给主人确认 → 等待
 *   2. 发布模式: node douyin_auto_publish.js -p
 *      → 直接连接已填写页面 → 点击发布按钮
 */

const puppeteer = require('/Users/popoll/.openclaw/workspace/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const fs = require('fs');

const CONFIG = {
    UPLOAD_URL: 'https://creator.douyin.com/creator-micro/content/upload',
    LOCATION_KEYWORD: '锦湖电脑数码城',
    LOCATION_TARGET_TEXT: '锦湖电脑数码城',
    DEFAULT_HASHTAGS: [],
    SAFE_MODE: true,
};

const randomDelay = (min = 1000, max = 3000) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    log(`⏳ ${delay}ms`);
    return new Promise(r => setTimeout(r, delay));
};

const log = (msg) => {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    console.log(`[${time}] ${msg}`);
};

/**
 * 发布模式：直接连接已填写页面，点击发布按钮
 */
async function doPublish() {
    log('🐾 石榴自动发布 v1.33 - 发布模式');
    let browser = null;
    try {
        browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
        const pages = await browser.pages();
        let page = pages.find(p => p.url().includes('creator.douyin.com'));
        if (!page) { log('❌ 未找到抖音页面'); return { success: false, error: '未找到抖音页面' }; }
        
        log('🚀 正在点击发布按钮...');
        const pubOk = await page.evaluate(() => {
            for (const btn of document.querySelectorAll('button')) {
                const text = btn.textContent.trim();
                if (text === '发布') {
                    const r = btn.getBoundingClientRect();
                    if (r.width > 50 && !btn.disabled && !btn.querySelector('.disabled')) {
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        });
        
        if (pubOk) {
            log('✅ 已点击发布按钮');
            await randomDelay(5000, 8000);
            return { success: true, message: '发布成功' };
        }
        return { success: false, error: '未找到发布按钮' };
    } catch (err) {
        log(`❌ ${err.message}`);
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.disconnect();
    }
}

/**
 * 填写模式：上传视频 + 填写表单 + 截图（等待主人确认）
 */
async function doFill(options = {}) {
    const { videoPath, title, description, hashtags, location } = options;
    
    if (!videoPath || !title) {
        log('❌ 缺少必要参数');
        return { success: false, error: '缺少必要参数' };
    }
    if (!fs.existsSync(videoPath)) {
        log(`❌ 文件不存在: ${videoPath}`);
        return { success: false, error: '文件不存在' };
    }
    
    log('🐾 石榴自动发布 v1.33 - 填写模式（安全模式）');
    
    let browser = null;
    try {
        browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
        const pages = await browser.pages();
        let page = pages.find(p => p.url().includes('creator.douyin.com'));
        if (!page) { log('❌ 未找到页面'); return { success: false }; }
        
        // v1.31 新增：双重防护处理"离开页面"弹窗
        // 1. 清除 beforeunload 事件，防止抖音触发离开确认弹窗
        // 2. 监听 dialog 自动点"离开"，作为双重保险
        log('🛡️ 安装页面导航防护...');
        await page.evaluate(() => {
            window.onbeforeunload = null;
            window.onunload = null;
        });
        page.on('dialog', async dialog => {
            if (dialog.type() === 'beforeunload' || dialog.message().includes('离开')) {
                await dialog.accept();
            } else {
                await dialog.dismiss();
            }
        });
        log('✅ 防护已安装');
        
        // v1.33：无论当前在哪个页面，直接导航到上传页
        log('\n🎬 Step 0: 进入高清发布页...');
        await page.goto(CONFIG.UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        log('✅ 已导航到上传页');
        await randomDelay(2000, 3000);
        
        await page.setViewport({ width: 1280, height: 800 });
        
        // Step 1: 导航到上传页面
        log('\n📍 Step 1: 上传页面');
        
        // Step 1: 残留页面检测 - 如果是有编辑器但无预览的空状态，强制重新导航
        const isStalePage = await page.evaluate(() => {
            const hasEditor = !!document.querySelector('.editor-kit-container');
            const hasValidPreview = !!document.querySelector('video:not([src=""]), img[src*="tos"]');
            const hasFileInput = !!document.querySelector('input[type="file"]');
            return hasEditor && !hasValidPreview && hasFileInput;
        });
        if (isStalePage) {
            log('⚠️ 检测到残留页面，重新打开上传页');
            await page.goto(CONFIG.UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await randomDelay(2000, 3000);
        } else if (!page.url().includes('upload')) {
            await page.goto(CONFIG.UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await randomDelay(2000, 3000);
        }
        
        // Step 2: 上传视频
        log('\n📤 Step 2: 上传视频');
        // v1.24 修复：不仅检查编辑器是否存在，还要检查是否有视频预览
        // 原因：空编辑器页面也有 .editor-kit-container，会导致跳过 uploadFile()
        const needUpload = await page.evaluate(() => {
            const hasEditor = !!document.querySelector('.editor-kit-container');
            const hasPreview = !!(document.querySelector('video:not([src=""])') || document.querySelector('img[src*="tos"]'));
            return !hasEditor || (hasEditor && !hasPreview);
        });
        if (needUpload) {
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.uploadFile(videoPath);
            } else {
                const btn = await page.evaluate(() => {
                    for (const b of document.querySelectorAll('button')) {
                        if (b.textContent.trim().includes('上传视频')) {
                            const r = b.getBoundingClientRect();
                            return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) };
                        }
                    }
                    return null;
                });
                if (btn) { await page.mouse.click(btn.x, btn.y); await randomDelay(1000,2000); }
                const fi2 = await page.$('input[type="file"]');
                if (fi2) await fi2.uploadFile(videoPath);
            }
            log('⏳ 处理中...');
            const start = Date.now();
            let uploadSuccess = false;
            while (Date.now()-start < 300000) { // 5分钟超时，支持大文件
                await randomDelay(3000,5000);
                const hasEditor = await page.evaluate(()=>!!document.querySelector('.editor-kit-container'));
                const hasPreview = await page.evaluate(()=>{
                    const video = document.querySelector('video:not([src=""])');
                    const img = document.querySelector('img[src*="tos"]');
                    return !!(video || img);
                });
                if (hasEditor && hasPreview) {
                    log('✅ 处理完成，视频预览已显示');
                    uploadSuccess = true;
                    break;
                } else if (hasEditor) {
                    log('⏳ 编辑器已加载，等待视频预览...');
                }
            }
            if (!uploadSuccess) {
                log('⚠️ 视频上传可能失败，继续执行但请主人检查');
            }
        }
        await randomDelay(2000,3000);
        
        // Step 3: 标题 - ⏭️ 跳过（主人铁律：不填标题，避免与描述重复）
        log('\n📝 Step 3: 标题 - ⏭️ 跳过（不填写，避免与描述重复）');
        
        // v1.21: 填表前强制滚动到顶部，确保描述框在屏幕内
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await randomDelay(800, 1200);
        
        // Step 4: 描述 - execCommand 一次性注入（不带话题）
        const descText = description || title;
        const allHashtags = hashtags || [];
        
        log('\n📄 Step 4: 描述');
        log(`   描述: "${descText.substring(0,40)}..."`);
        
        const descOk = await page.evaluate((text) => {
            for (const el of document.querySelectorAll('[contenteditable="true"]')) {
                const r = el.getBoundingClientRect();
                if (r.width > 100 && r.y >= -50 && r.y < 400) {
                    el.focus();
                    // v1.21: 彻底清空编辑器内容
                    el.innerHTML = '';
                    el.textContent = '';
                    document.execCommand('insertText', false, text);
                    return true;
                }
            }
            return false;
        }, descText);
        
        if (descOk) {
            log('✅ 描述输入完成（execCommand 一次性注入）');
        } else {
            log('⚠️ 描述输入可能失败');
        }
        await randomDelay(1500, 2000);
        
        // Step 5: 话题 - CDP insertText 防锁屏丢失 + 小红书选择方式（v1.29）
        if (allHashtags.length > 0) {
            log(`\n#️⃣ Step 5: 话题 (${allHashtags.length}个)`);
            log(`   话题: ${allHashtags.join(' ')}`);
            
            // 创建 CDP 会话用于稳定输入
            const cdpSession = await page.createCDPSession();
            
            // 点击描述框获取焦点
            log('   🎯 点击描述框获取焦点...');
            await page.evaluate(() => {
                for (const el of document.querySelectorAll('[contenteditable="true"]')) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 100 && r.y >= -50 && r.y < 400) {
                        el.focus();
                        return true;
                    }
                }
                return false;
            });
            await randomDelay(300, 500);
            
            for (let idx = 0; idx < allHashtags.length; idx++) {
                const rawTag = allHashtags[idx];
                const hashtag = rawTag.startsWith('#') ? rawTag : '#' + rawTag;
                log(`   [${idx+1}/${allHashtags.length}] ${hashtag}`);
                
                // v1.29 修改：使用 CDP insertText 输入 #话题，防止锁屏后丢失
                await cdpSession.send('Input.insertText', { text: hashtag });
                await randomDelay(2000, 3000); // 等待推荐弹窗出现
                
                // 选择推荐话题（CDP 发送按键：ArrowDown + Enter）
                await cdpSession.send('Input.dispatchKeyEvent', {
                    type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40
                });
                await cdpSession.send('Input.dispatchKeyEvent', {
                    type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40
                });
                await randomDelay(200, 400);
                
                await cdpSession.send('Input.dispatchKeyEvent', {
                    type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r'
                });
                await cdpSession.send('Input.dispatchKeyEvent', {
                    type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13
                });
                log(`   ✅ 已选择`);
                
                // 空格分隔（CDP insertText）
                await cdpSession.send('Input.insertText', { text: ' ' });
                await randomDelay(500, 800);
            }
            
            await cdpSession.detach();
        }
        
        // Step 6: 位置（v1.10 成功经验：DOM检测 + 自动切换 + .semi-portal 精确匹配）
        log('\n📍 Step 6: 位置');
        const locKeyword = location || CONFIG.LOCATION_KEYWORD;
        
        // 6.1: 滚动到位置区域（页面底部）
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await randomDelay(500, 800);
        await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }));
        await randomDelay(1500, 2000);
        
        // 6.2: DOM 查找扩展类型下拉框（不依赖写死坐标）
        const extTypeInfo = await page.evaluate(() => {
            for (const el of document.querySelectorAll('.semi-select')) {
                const text = el.textContent.trim();
                if (text.includes('游戏手柄') || text.includes('位置') || text.includes('影视') || text.includes('标记')) {
                    const r = el.getBoundingClientRect();
                    return {
                        type: text,
                        rect: { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }
                    };
                }
            }
            return null;
        });
        
        log(`   📋 当前扩展类型: ${extTypeInfo ? '"' + extTypeInfo.type + '"' : '未检测到'}`);
        
        // 6.3: 如果当前不是"位置"，自动切换（v1.19 修复：等菜单渲染 + 放宽选择器 + 键盘回退）
        if (!extTypeInfo || !extTypeInfo.type.includes('位置')) {
            log('   🔄 切换扩展类型为"位置"...');
            
            if (extTypeInfo) {
                const cx = extTypeInfo.rect.x;
                const cy = extTypeInfo.rect.y;
                log(`   📍 点击坐标: (${cx}, ${cy})`);
                await page.mouse.click(cx, cy);
            } else {
                const found = await page.evaluate(() => {
                    for (const el of document.querySelectorAll('.semi-select')) {
                        if (el.textContent.includes('游戏手柄') || el.textContent.includes('影视') || el.textContent.includes('标记')) {
                            el.click();
                            return true;
                        }
                    }
                    return false;
                });
                if (!found) log('   ⚠️ 未找到下拉框');
            }
            // 等 2-3 秒让下拉菜单完全渲染（v1.19 加长等待）
            await randomDelay(2500, 3000);
            
            // 在 .semi-portal / .semi-popover 弹出层中找"位置"选项（放宽 y 范围）
            const locTypeOk = await page.evaluate(() => {
                for (const portal of document.querySelectorAll('.semi-portal, .semi-popover')) {
                    const pr = portal.getBoundingClientRect();
                    if (pr.height > 0 && pr.width > 0) {
                        for (const el of portal.querySelectorAll('div, span')) {
                            const text = el.textContent.trim();
                            // 只找"位置"两个字的选项（排除长文本）
                            if ((text === '位置' || (text.includes('位置') && text.length <= 4)) && text.length > 1) {
                                const r = el.getBoundingClientRect();
                                if (r.width > 20 && r.width < 200 && r.height > 10 && r.height < 60) {
                                    el.click();
                                    return { ok: true, method: 'popup-click' };
                                }
                            }
                        }
                    }
                }
                return { ok: false };
            });
            
            if (locTypeOk.ok) {
                log('   ✅ 已切换为"位置"类型（弹出层点击）');
            } else {
                // 回退：键盘 ↓ 选中第一项 + Enter（通常第一项就是"位置"）
                log('   ⚠️ 弹出层未找到位置选项，尝试键盘 ↓+Enter...');
                await page.keyboard.press('ArrowDown');
                await randomDelay(300, 500);
                await page.keyboard.press('Enter');
                await randomDelay(1000, 1500);
            }
            await randomDelay(1000, 1500);
        } else {
            log('   ✅ 已是"位置"类型，无需切换');
        }
        
        // 6.4: 等待 1 秒确认"位置"类型已生效（输入框需要时间出现）
        await randomDelay(1000, 1500);
        
        // 6.5: 找到位置输入框并点击（v1.19 增强：扩大搜索范围）
        const inputClicked = await page.evaluate(() => {
            for (const el of document.querySelectorAll('.semi-select-selection-placeholder')) {
                const text = el.textContent.trim();
                if (text === '输入地理位置') {
                    let parent = el.parentElement;
                    while (parent && !parent.className.includes('semi-select')) {
                        parent = parent.parentElement;
                    }
                    if (parent) {
                        parent.click();
                        return { ok: true, method: 'placeholder' };
                    }
                }
            }
            for (const el of document.querySelectorAll('*')) {
                const text = el.textContent.trim();
                if (text === '输入地理位置') {
                    let parent = el.parentElement;
                    for (let i = 0; i < 5; i++) {
                        if (!parent) break;
                        if (parent.className.includes('semi-select')) {
                            parent.click();
                            return { ok: true, method: 'text-parent' };
                        }
                        parent = parent.parentElement;
                    }
                }
            }
            return { ok: false };
        });
        
        if (inputClicked.ok) {
            log(`   ✅ 已点击位置输入框 (${inputClicked.method})`);
        } else {
            log('   ⚠️ 未找到位置输入框');
        }
        await randomDelay(1000, 1500);
        
        // 6.6: 输入关键词（在位置输入框中）
        await page.keyboard.type(locKeyword, { delay: 50 });
        log(`   ✅ 已输入: "${locKeyword}"`);
        await randomDelay(3000, 4000);
        
        // v1.36: 位置选择修复 - 精准定位搜索结果弹窗 + 精准点击单个结果项
        let locSelOk = { ok: false, method: 'none' };
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!locSelOk.ok && retryCount < maxRetries) {
            if (retryCount > 0) {
                log(`   🔄 第${retryCount}次重试选择位置...`);
                // 重新点击位置输入框触发搜索
                await page.evaluate(() => {
                    for (const el of document.querySelectorAll('.semi-select-selection-placeholder')) {
                        const text = el.textContent.trim();
                        if (text === '输入地理位置' || text.includes('锦湖')) {
                            let parent = el.parentElement;
                            while (parent && !parent.className.includes('semi-select')) {
                                parent = parent.parentElement;
                            }
                            if (parent) { parent.click(); return true; }
                        }
                    }
                    return false;
                });
                await randomDelay(2000, 3000);
                // 重新输入关键词
                await page.keyboard.type(locKeyword, { delay: 50 });
                await randomDelay(3000, 4000);
            }
            
            locSelOk = await page.evaluate((keyword) => {
                // Step 1: 找到包含关键词的搜索结果弹窗（排除类别选择器弹窗）
                let targetPortal = null;
                for (const portal of document.querySelectorAll('.semi-portal, .semi-popover')) {
                    const pr = portal.getBoundingClientRect();
                    if (pr.height <= 0 || pr.width <= 0) continue;
                    const text = portal.textContent.trim();
                    // 只有包含关键词的弹窗才是搜索结果弹窗
                    if (text.includes(keyword)) {
                        targetPortal = portal;
                        break;
                    }
                }
                if (!targetPortal) return { ok: false, method: 'no-search-portal' };
                
                // Step 2: 在搜索结果弹窗中找所有 div/span 元素
                const allEls = targetPortal.querySelectorAll('div, span');
                const candidates = [];
                for (const el of allEls) {
                    const text = el.textContent.trim();
                    const r = el.getBoundingClientRect();
                    // 过滤条件：文本以关键词开头（确保是结果项，不是容器）
                    if ((text.startsWith(keyword) || text === keyword) &&
                        r.width > 50 && r.width < 600 && r.height > 10 && r.height < 80 &&
                        r.y >= 0) {
                        candidates.push({ el, text, area: r.width * r.height });
                    }
                }
                
                // Step 3: 选择面积最小的匹配元素（最精确的结果项，不是外层容器）
                if (candidates.length > 0) {
                    candidates.sort((a, b) => a.area - b.area);
                    const best = candidates[0];
                    best.el.click();
                    return { ok: true, method: 'precise-match', text: best.text.substring(0, 50) };
                }
                
                // Step 4: 回退 - 找第一个合理的可见项
                for (const el of allEls) {
                    const text = el.textContent.trim();
                    const r = el.getBoundingClientRect();
                    if (text.length > 4 && text.length < 100 &&
                        text.includes(keyword) &&
                        r.width > 100 && r.width < 500 && r.height > 10 && r.height < 60 &&
                        r.y >= 0) {
                        el.click();
                        return { ok: true, method: 'first-item', text: text.substring(0, 50) };
                    }
                }
                
                return { ok: false, method: 'no-clickable-item' };
            }, locKeyword);
            
            // 如果 DOM 选择失败，用键盘回退
            if (!locSelOk.ok) {
                log('   ⚠️ DOM 选择失败，使用键盘回退...');
                await page.keyboard.press('ArrowDown');
                await randomDelay(300, 500);
                await page.keyboard.press('Enter');
                await randomDelay(1000, 1500);
                // 验证键盘选择是否成功
                const verifyResult = await page.evaluate(() => {
                    for (const el of document.querySelectorAll('.semi-select')) {
                        const text = el.textContent.trim();
                        if (text.includes('锦湖') && !text.includes('输入地理位置')) {
                            return { ok: true, value: text };
                        }
                    }
                    return { ok: false };
                });
                if (verifyResult.ok) {
                    locSelOk = { ok: true, method: 'keyboard-fallback', text: verifyResult.value.substring(0, 50) };
                } else {
                    log('   ⚠️ 键盘回退也未选中');
                }
            }
            
            retryCount++;
        }
        
        if (locSelOk.ok) {
            log(`   ✅ 已选中: "${locSelOk.text}" (${locSelOk.method})`);
        } else {
            log('   ⚠️ 未选中位置');
        }
        
        await randomDelay(1000, 1500);
        
        // Step 7: 截图（截上半部分，确保能看到编辑框）
        log('\n📸 截图');
        const screenshotPath = `/tmp/douyin_publish_preview_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 700 } });
        log(`📸 ${screenshotPath}`);
        
        // Step 8: 返回结果（安全模式，等待主人确认）
        log('\n🛡️ 安全模式: 请手动确认发布');
        log(`   标题: ${title}`);
        log(`   描述: ${descText.substring(0,40)}...`);
        log(`   话题: ${allHashtags.join(' ')}`);
        log(`   位置: ${locKeyword}`);
        log('\n💡 确认后运行: node douyin_auto_publish.js -p');
        return { success: true, safeMode: true, screenshotPath };
        
    } catch (err) {
        log(`❌ ${err.message}`);
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.disconnect();
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    let videoPath, title, description, hashtags=[], location, safeMode=CONFIG.SAFE_MODE, publishMode=false;
    
    for (let i=0; i<args.length; i++) {
        switch(args[i]) {
            case '-v':case'--video':videoPath=args[++i];break;
            case '-t':case'--title':title=args[++i];break;
            case '-d':case'--desc':description=args[++i];break;
            case '-h':case'--hashtags':hashtags=args[++i].split(/[\s,]+/).map(s=>s.trim()).filter(s=>s);break;
            case '-l':case'--location':location=args[++i];break;
            case '-p':case'--publish':publishMode=true;break;
            case '-s':case'--safe':safeMode=true;break;
        }
    }
    
    if (publishMode) {
        doPublish().then(r=>{
            log(r.success?`✅ ${r.message||'完成'}`:`❌ ${r.error}`);
            if(!r.success) process.exit(1);
        }).catch(e=>{log(`❌ ${e.message}`);process.exit(1);});
    } else if (!videoPath || !title) {
        console.log('用法:');
        console.log('  填写模式: node douyin_auto_publish.js -s -v <视频> -t <标题> [-d <描述>] [-h <话题>] [-l <位置>]');
        console.log('  发布模式: node douyin_auto_publish.js -p');
        process.exit(1);
    } else {
        doFill({videoPath,title,description,hashtags,location,safeMode}).then(r=>{
            log(r.success?`✅ ${r.message||'完成'}`:`❌ ${r.error}`);
            if(!r.success) process.exit(1);
        }).catch(e=>{log(`❌ ${e.message}`);process.exit(1);});
    }
}

module.exports = { autoPublish: doFill, doPublish, doFill, CONFIG };
