/**
 * 纯测试：只填描述+话题，不上传、不选位置
 */
const puppeteer = require('/Users/popoll/.openclaw/workspace/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');

const randomDelay = (min = 1000, max = 3000) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏳ ${delay}ms`);
    return new Promise(r => setTimeout(r, delay));
};
const log = (msg) => {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    console.log(`[${time}] ${msg}`);
};

async function testInput() {
    log('🐾 纯输入测试开始');
    let browser = null;
    try {
        browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 180000 });
        const allPages = await browser.pages();
        let page = null;
        for (const p of allPages) {
            if (p.url().includes('creator.douyin.com') && p.url().includes('post')) {
                page = p;
                log('🎯 找到编辑页: ' + p.url());
                break;
            }
        }
        if (!page) {
            page = allPages.find(p => p.url().includes('creator.douyin.com'));
            log('⚠️ 用当前页: ' + page.url());
        }
        
        // 导航到 post/video 编辑页
        log('🔄 导航到 post/video...');
        await page.goto('https://creator.douyin.com/creator-micro/content/post/video', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await randomDelay(5000, 7000);
        
        // 点击上传区域上传视频
        log('📤 上传测试视频...');
        const videoPath = '/Users/popoll/.openclaw/media/qqbot/downloads/mmexport1777209816869_1777231031063_6c74b1.mp4';
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
            await fileInput.uploadFile(videoPath);
            log('✅ 上传成功');
        } else {
            log('❌ 未找到上传按钮');
        }
        
        // 等待视频处理完成
        log('⏳ 等待处理...');
        for (let i = 0; i < 20; i++) {
            await randomDelay(3000, 4000);
            const hasEditor = await page.evaluate(() => !!document.querySelector('.editor-kit-container'));
            if (hasEditor) {
                log('✅ 编辑页就绪');
                break;
            }
            log(`   等待中 ${i+1}/20...`);
        }

        const desc = "给我5秒钟～让你穿越回千禧年❤️ 每个妈妈都曾是少女~";
        const hashtags = ["#南阳嗨舞", "#南阳嗨舞工作室", "#千禧年回忆", "#宝妈跳舞", "#爵士舞"];

        // Step 1: 清空描述框 + 输入描述
        log('\n📄 Step 1: 清空 + 描述');
        await page.evaluate(() => {
            for (const el of document.querySelectorAll('[contenteditable="true"]')) {
                const r = el.getBoundingClientRect();
                if (r.width > 100 && r.y >= -50 && r.y < 400) {
                    el.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('delete', false, null);
                    return true;
                }
            }
            return false;
        });
        await randomDelay(300, 500);

        await page.evaluate((text) => {
            for (const el of document.querySelectorAll('[contenteditable="true"]')) {
                const r = el.getBoundingClientRect();
                if (r.width > 100 && r.y >= -50 && r.y < 400) {
                    el.focus();
                    document.execCommand('insertText', false, text);
                    return true;
                }
            }
            return false;
        }, desc);
        log(`✅ 描述输入: "${desc}"`);
        await randomDelay(500, 800);

        // Step 2: 方案C - CDP Input.dispatchKeyEvent 绕过 Puppeteer keyboard.type 吞掉#的问题
        log('\n#️⃣ Step 2: 话题（方案C: CDP dispatchKeyEvent）');
        const cdp = await page.target().createCDPSession();
        
        // 聚焦编辑框
        await page.evaluate(() => {
            for (const el of document.querySelectorAll('[contenteditable="true"]')) {
                const r = el.getBoundingClientRect();
                if (r.width > 100 && r.y >= -50 && r.y < 400) {
                    el.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('delete', false, null);
                    // 重新输入描述
                    document.execCommand('insertText', false, desc);
                    return true;
                }
            }
            return false;
        });
        log(`   ✅ 描述已输入`);
        await randomDelay(500, 800);
        
        // 用 CDP 逐个字符发送话题（绕过 Puppeteer 的 keyboard.type）
        for (let idx = 0; idx < hashtags.length; idx++) {
            const hashtag = hashtags[idx];
            log(`   [${idx+1}/${hashtags.length}] ${hashtag}`);
            
            // 先输入空格
            await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: ' ' });
            await randomDelay(200, 300);
            
            // 逐个字符发送话题
            for (const ch of hashtag) {
                await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: ch });
                await randomDelay(100, 150);
            }
            
            // 按空格确认
            await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ' });
            await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space' });
            
            log(`   ✅ 输入完成，等2秒...`);
            await randomDelay(2000, 2500);
            
            // 检查当前状态
            const check = await page.evaluate(() => {
                for (const el of document.querySelectorAll('[contenteditable="true"]')) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 100 && r.y >= -50 && r.y < 400) {
                        const text = el.textContent;
                        const hashtagMatches = text.match(/#[^\s#]+/g) || [];
                        return { text: text.substring(0, 150), hashtagCount: hashtagMatches.length };
                    }
                }
                return { text: '未找到', hashtagCount: 0 };
            });
            log(`   📊 当前: "${check.text}"`);
        }
        
        await cdp.detach();

        // 截图
        const path = `/tmp/douyin_test_input_${Date.now()}.png`;
        await page.screenshot({ path, fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 700 } });
        log(`\n📸 截图: ${path}`);

    } catch (err) {
        log(`❌ ${err.message}`);
    } finally {
        if (browser) await browser.disconnect();
    }
}

testInput();
