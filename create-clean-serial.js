// 完全重写serial.js文件
const fs = require('fs');

function createCleanSerialJS() {
    console.log('创建完全干净的 serial.js...');
    
    // 首先从原始备份开始
    let content = fs.readFileSync('renderer/assets/js/serial.js.backup', 'utf8');
    
    // 删除所有额外的方法定义，只保留原始的window.SerialModule对象
    const lines = content.split('\n');
    const cleanLines = [];
    
    let foundMainModule = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 找到window.SerialModule对象定义开始
        if (line.includes('window.SerialModule = {')) {
            foundMainModule = true;
        }
        
        // 如果找到了对象定义开始，继续直到找到对象的结束
        if (foundMainModule) {
            cleanLines.push(line);
            
            // 如果这行是对象的结束，停止
            if (line.trim() === '};') {
                break;
            }
        } else {
            cleanLines.push(line);
        }
    }
    
    // 如果没有找到主要对象，从第一行开始重建
    if (!foundMainModule) {
        console.log('⚠️ 没有找到window.SerialModule，使用原始文件');
        cleanLines.push('// 重写的文件');
        cleanLines.push(content.split('\n').slice(0, 100).join('\n'));
    }
    
    // 添加文件结尾
    const ending = [
        '',
        '// 监听连接状态变化',
        'document.addEventListener(\'connectionStatusChange\', (event) => {',
        '    console.log(\'连接状态变化:\', event.detail);',
        '});',
        '',
        'console.log(\'串口通信模块已加载\');'
    ];
    
    const finalContent = [...cleanLines, ...ending].join('\n');
    
    // 写入新文件
    fs.writeFileSync('renderer/assets/js/serial.js', finalContent);
    console.log('✅ 干净的 serial.js 已创建');
    
    // 测试语法
    try {
        require('child_process').execSync('node -c renderer/assets/js/serial.js');
        console.log('✅ 语法检查通过');
        return true;
    } catch (error) {
        console.log('❌ 语法检查失败:', error.message);
        return false;
    }
}

createCleanSerialJS();