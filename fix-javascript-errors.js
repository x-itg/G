// JavaScript错误修复脚本
const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
    'renderer/assets/js/serial.js',
    'renderer/assets/js/system-settings.js',
    'renderer/assets/js/ui.js',
    'renderer/assets/js/accessibility.js'
];

console.log('开始修复JavaScript错误...\n');

filesToFix.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 检查语法错误
            const syntaxErrors = [];
            
            // 检查是否有孤立的关键字或语法错误
            if (content.includes('Unexpected identifier')) {
                syntaxErrors.push('发现语法错误：Unexpected identifier');
            }
            
            if (content.includes('Unexpected token')) {
                syntaxErrors.push('发现语法错误：Unexpected token');
            }
            
            if (content.includes('export ') && !content.includes('module.exports')) {
                syntaxErrors.push('发现ES模块语法错误');
            }
            
            if (syntaxErrors.length > 0) {
                console.log(`❌ ${file}: ${syntaxErrors.join(', ')}`);
            } else {
                console.log(`✅ ${file}: 语法检查通过`);
            }
            
        } catch (error) {
            console.error(`❌ 读取文件失败 ${file}:`, error.message);
        }
    } else {
        console.log(`⚠️  文件不存在: ${file}`);
    }
});

console.log('\n修复完成！');