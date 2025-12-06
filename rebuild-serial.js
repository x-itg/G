// 清理和重新构建serial.js文件
const fs = require('fs');

function rebuildSerialJS() {
    console.log('开始重新构建 serial.js...');
    
    // 读取原文件
    const originalContent = fs.readFileSync('renderer/assets/js/serial.js.backup', 'utf8');
    const lines = originalContent.split('\n');
    
    // 找到window.SerialModule对象的正确结束位置
    let objectEndIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line === '};' && !line.startsWith('//')) {
            objectEndIndex = i;
            break;
        }
    }
    
    if (objectEndIndex > 0) {
        // 保留window.SerialModule对象定义之前的所有内容
        const beforeObject = lines.slice(0, objectEndIndex + 1);
        
        // 在对象内部添加额外的方法
        beforeObject[objectEndIndex] = `    },
    
    // 探头移动到指定位置
    moveToPosition(x, y, z = null) {
        if (!this.isConnected) {
            throw new Error('设备未连接');
        }

        try {
            const targetZ = z !== null ? z : this.currentPosition.z;
            const speed = this.currentPosition.speed;
            
            Auth.log(\`移动到位置: (\${x}, \${y}, \${targetZ})\`, 'info');
            
            // 发送移动命令
            if (this.simulatorMode) {
                return this.moveToPositionSimulator(x, y, targetZ, speed);
            } else {
                return window.electronAPI.serial.moveToPosition(x, y, targetZ, speed);
            }
            
        } catch (error) {
            console.error('位置移动失败:', error);
            Auth.log(\`移动失败: \${error.message}\`, 'error');
            throw error;
        }
    }
};`;
        
        // 添加最后的代码
        const endCode = [
            '',
            '// 监听连接状态变化',
            'document.addEventListener(\'connectionStatusChange\', (event) => {',
            '    console.log(\'连接状态变化:\', event.detail);',
            '});',
            '',
            'console.log(\'串口通信模块已加载\');'
        ];
        
        const finalContent = [...beforeObject, ...endCode].join('\n');
        
        // 写入修复后的文件
        fs.writeFileSync('renderer/assets/js/serial.js', finalContent);
        console.log('✅ serial.js 已重新构建完成');
        
        // 测试语法
        require('child_process').exec('node -c renderer/assets/js/serial.js', (error) => {
            if (error) {
                console.log('❌ 语法检查失败:', error.message);
            } else {
                console.log('✅ 语法检查通过');
            }
        });
        
    } else {
        console.log('❌ 无法找到window.SerialModule对象的结束位置');
    }
}

rebuildSerialJS();