// JavaScript结构修复脚本
const fs = require('fs');
const path = require('path');

// 修复serial.js的结构问题
function fixSerialJS() {
    const filePath = 'renderer/assets/js/serial.js';
    console.log('正在修复 serial.js 文件结构...');
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // 找到window.SerialModule对象的结束位置
        let objectEndIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === '};') {
                objectEndIndex = i;
                break;
            }
        }
        
        if (objectEndIndex > 0) {
            // 在window.SerialModule对象后添加移动到位置的方法
            const moveToPositionMethod = `
    },

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
    },
    
    // 模拟器位置移动
    async moveToPositionSimulator(x, y, z, speed) {
        const distance = Math.sqrt(
            Math.pow(x - this.currentPosition.x, 2) +
            Math.pow(y - this.currentPosition.y, 2) +
            Math.pow(z - this.currentPosition.z, 2)
        );
        
        const moveTime = distance / speed * 1000;
        this.simulatorMoving = true;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                this.simulatorMoving = false;
                this.currentPosition = { x, y, z, speed };
                resolve();
            }, Math.min(moveTime, 3000));
        });
    }
};`;

            // 重新构建文件
            const beforeObject = lines.slice(0, objectEndIndex).join('\n');
            const afterObject = lines.slice(objectEndIndex + 1).join('\n');
            
            const fixedContent = beforeObject + moveToPositionMethod + '\n\n' + afterObject;
            
            // 备份原文件
            fs.writeFileSync(filePath + '.backup', content);
            fs.writeFileSync(filePath, fixedContent);
            
            console.log('✅ serial.js 文件已修复并备份');
            
        } else {
            console.log('❌ 无法找到window.SerialModule对象的结束位置');
        }
        
    } catch (error) {
        console.error('修复失败:', error.message);
    }
}

// 运行修复
fixSerialJS();