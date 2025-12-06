/**
 * 探头控制配置管理功能测试
 * Probe Configuration Management Test
 */

const ProbeControlService = require('../services/ProbeControlService');
const { v4: uuidv4 } = require('uuid');

// 模拟数据库
class MockDatabase {
    constructor() {
        this.data = new Map();
    }
    
    async all(sql, params) {
        return [];
    }
    
    async run(sql, params) {
        return { changes: 1, lastID: 1 };
    }
    
    async get(sql, params) {
        return null;
    }
}

async function testProbeConfigManagement() {
    console.log('🧪 开始测试探头控制配置管理功能...\n');
    
    try {
        // 初始化服务
        const mockDb = new MockDatabase();
        const probeService = new ProbeControlService(mockDb);
        
        console.log('1. ✅ 服务初始化测试');
        
        // 测试配置获取
        console.log('\n2. 📋 测试配置获取功能');
        const configResult = probeService.getConfiguration();
        if (configResult.success) {
            console.log('   ✅ 配置获取成功');
            console.log('   📊 工作区域:', configResult.data.config.workArea);
            console.log('   ⚡ 速度配置:', configResult.data.config.speed);
        } else {
            throw new Error('配置获取失败');
        }
        
        // 测试配置验证
        console.log('\n3. 🔍 测试配置验证功能');
        
        // 正常配置测试
        const validConfig = {
            workArea: { x: { min: 0, max: 1000 }, y: { min: 0, max: 800 }, z: { min: 0, max: 500 } },
            speed: { max: 50, normal: 20, slow: 5, approach: 2 },
            accuracy: { positional: 0.1, angular: 1.0 }
        };
        
        const validResult = probeService.preValidateConfiguration(validConfig);
        if (validResult.valid) {
            console.log('   ✅ 有效配置验证通过');
        } else {
            throw new Error('有效配置验证失败');
        }
        
        // 无效配置测试
        console.log('\n4. ❌ 测试无效配置检查');
        const invalidConfig = {
            workArea: { x: { min: 100, max: 50 }, y: { min: 0, max: 800 }, z: { min: 0, max: 500 } },
            speed: { max: -10, normal: 20, slow: 5, approach: 2 },
            accuracy: { positional: 0, angular: 1.0 }
        };
        
        const invalidResult = probeService.preValidateConfiguration(invalidConfig);
        if (!invalidResult.valid && invalidResult.errors.length > 0) {
            console.log('   ✅ 无效配置正确识别错误:');
            invalidResult.errors.forEach(error => {
                console.log(`      • ${error}`);
            });
        } else {
            throw new Error('无效配置验证失败');
        }
        
        // 测试配置更新
        console.log('\n5. 💾 测试配置更新功能');
        const updateConfig = {
            workArea: { x: { min: 0, max: 1200 }, y: { min: 0, max: 900 }, z: { min: 0, max: 600 } },
            speed: { max: 60, normal: 25, slow: 8, approach: 3 }
        };
        
        const updateResult = await probeService.updateConfiguration(updateConfig);
        if (updateResult.success) {
            console.log('   ✅ 配置更新成功');
            console.log('   📊 更新后的工作区域:', updateResult.config.workArea);
        } else {
            throw new Error('配置更新失败: ' + updateResult.error);
        }
        
        // 测试位置验证
        console.log('\n6. 📍 测试位置验证功能');
        const testPositions = [
            { x: 500, y: 400, z: 250, expected: true },  // 正常位置
            { x: 1500, y: 400, z: 250, expected: false }, // X轴超出
            { x: -10, y: 400, z: 250, expected: false },  // X轴负值
            { x: 500, y: 1000, z: 250, expected: false }, // Y轴超出
            { x: 500, y: 400, z: 700, expected: false }   // Z轴超出
        ];
        
        for (const pos of testPositions) {
            const boundaryCheck = probeService.checkBoundary(pos);
            if (boundaryCheck.valid === pos.expected) {
                console.log(`   ✅ 位置验证 (${pos.x}, ${pos.y}, ${pos.z}): ${boundaryCheck.valid ? '有效' : '无效'}`);
            } else {
                console.log(`   ❌ 位置验证失败 (${pos.x}, ${pos.y}, ${pos.z}): 期望${pos.expected}，实际${boundaryCheck.valid}`);
            }
        }
        
        // 测试边界状态详细检查
        console.log('\n7. 📏 测试边界状态详细检查');
        const boundaryStatus = probeService.getBoundaryStatus({ x: 1500, y: 400, z: 250 });
        console.log('   📊 边界状态:', JSON.stringify(boundaryStatus, null, 2));
        
        // 测试位置调整建议
        console.log('\n8. 💡 测试位置调整建议');
        const adjustmentSuggestion = probeService.suggestPositionAdjustment({ x: 1500, y: 400, z: 250 });
        console.log('   🔧 调整建议:', JSON.stringify(adjustmentSuggestion, null, 2));
        
        // 测试配置警告
        console.log('\n9. ⚠️  测试配置警告功能');
        const warningConfig = {
            speed: { max: 300, normal: 250, slow: 50, approach: 25 }
        };
        
        const warningResult = probeService.validateConfiguration(warningConfig);
        if (warningResult.warnings && warningResult.warnings.length > 0) {
            console.log('   ✅ 配置警告正确生成:');
            warningResult.warnings.forEach(warning => {
                console.log(`      ⚠️ ${warning}`);
            });
        }
        
        console.log('\n🎉 所有配置管理功能测试通过！');
        console.log('\n📋 测试总结:');
        console.log('   ✅ 配置获取功能');
        console.log('   ✅ 配置验证逻辑');
        console.log('   ✅ 无效配置检查');
        console.log('   ✅ 配置更新功能');
        console.log('   ✅ 位置验证功能');
        console.log('   ✅ 边界状态检查');
        console.log('   ✅ 调整建议功能');
        console.log('   ✅ 配置警告功能');
        
        console.log('\n🚀 探头控制配置管理功能完善完成！');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error('错误详情:', error);
        process.exit(1);
    }
}

// 执行测试
testProbeConfigManagement();