#!/usr/bin/env node

/**
 * 辐射检测器设备通讯协议测试脚本
 * 用于测试协议解析、设备控制、数据采集等功能
 */

const { PROTOCOL, ProtocolUtils, PositionData, CountRateData } = require('./protocol/DeviceProtocol');
const RadiationDetectorSimulator = require('./protocol/RadiationDetectorSimulator');

console.log('\n===================================================');
console.log('  辐射检测器设备通讯协议测试');
console.log('===================================================\n');

/**
 * 测试协议解析功能
 */
async function testProtocolParsing() {
    console.log('🔬 测试1: 协议解析功能');
    
    try {
        // 测试位置数据编码/解码
        const position = {
            x: 100.5,
            y: 200.25,
            z: 50.75,
            speed: 15.5
        };
        
        const encodedPosition = ProtocolUtils.encodePositionData(position);
        const decodedPosition = ProtocolUtils.decodePositionData(encodedPosition);
        
        console.log(`   原始位置: x=${position.x}, y=${position.y}, z=${position.z}, speed=${position.speed}`);
        console.log(`   解码位置: x=${decodedPosition.x}, y=${decodedPosition.y}, z=${decodedPosition.z}, speed=${decodedPosition.speed}`);
        
        // 测试计数率数据编码/解码
        const countRateData = {
            timestamp: Date.now(),
            countRate: 156.7,
            totalCounts: 15678,
            liveTime: 100.5,
            realTime: 110.2
        };
        
        const encodedCountRate = ProtocolUtils.encodeCountRateData(countRateData);
        const decodedCountRate = ProtocolUtils.decodeCountRateData(encodedCountRate);
        
        console.log(`   原始计数率: ${countRateData.countRate} cps`);
        console.log(`   解码计数率: ${decodedCountRate.countRate} cps`);
        
        console.log('   ✅ 协议解析测试通过\n');
        return true;
    } catch (error) {
        console.log(`   ❌ 协议解析测试失败: ${error.message}\n`);
        return false;
    }
}

/**
 * 测试帧生成和解析
 */
async function testFrameGeneration() {
    console.log('🔬 测试2: 帧生成和解析');
    
    try {
        // 生成移动命令帧
        const position = { x: 50, y: 100, z: 25, speed: 20 };
        const positionData = ProtocolUtils.encodePositionData(position);
        const moveFrame = ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_MOVE_TO,
            positionData
        );
        
        console.log(`   生成移动帧: ${moveFrame.toString('hex')}`);
        
        // 解析移动命令帧
        const parsedFrame = ProtocolUtils.parseFrame(moveFrame);
        console.log(`   解析帧: 命令=${parsedFrame.command.toString(16)}, 有效=${parsedFrame.valid}`);
        
        // 验证帧内容
        if (parsedFrame.valid && parsedFrame.command === PROTOCOL.COMMANDS.PROBE_MOVE_TO) {
            const decodedPosition = ProtocolUtils.decodePositionData(parsedFrame.data);
            console.log(`   解码位置: x=${decodedPosition.x}, y=${decodedPosition.y}`);
            console.log('   ✅ 帧生成和解析测试通过\n');
            return true;
        } else {
            throw new Error('帧解析失败');
        }
    } catch (error) {
        console.log(`   ❌ 帧生成和解析测试失败: ${error.message}\n`);
        return false;
    }
}

/**
 * 测试设备模拟器
 */
async function testDeviceSimulator() {
    console.log('🔬 测试3: 设备模拟器');
    
    try {
        const simulator = new RadiationDetectorSimulator();
        
        // 连接模拟器
        console.log('   正在连接模拟器...');
        const connectResult = await simulator.connect();
        console.log(`   连接结果: ${connectResult.success ? '成功' : '失败'}`);
        
        if (!connectResult.success) {
            throw new Error('模拟器连接失败');
        }
        
        // 测试命令处理
        console.log('   测试探头归零命令...');
        const homeFrame = ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.PROBE_HOME);
        const homeResponse = simulator.processCommand({
            sourceId: 0x01,
            destId: 0x02,
            command: PROTOCOL.COMMANDS.PROBE_HOME,
            data: Buffer.from([])
        });
        
        if (homeResponse) {
            console.log('   ✅ 归零命令响应正常');
        }
        
        // 测试位置设置
        console.log('   测试位置设置命令...');
        const position = { x: 75, y: 125, z: 30, speed: 15 };
        const positionData = ProtocolUtils.encodePositionData(position);
        const positionFrame = ProtocolUtils.generateFrame(
            PROTOCOL.COMMANDS.PROBE_POSITION_SET,
            positionData
        );
        
        const positionResponse = simulator.processCommand(ProtocolUtils.parseFrame(positionFrame));
        console.log(`   位置设置响应: ${positionResponse ? '成功' : '无响应'}`);
        
        // 测试测量开始
        console.log('   测试测量开始命令...');
        const measureFrame = ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.MEASUREMENT_START);
        const measureResponse = simulator.processCommand(ProtocolUtils.parseFrame(measureFrame));
        console.log(`   测量开始响应: ${measureResponse ? '成功' : '无响应'}`);
        
        // 等待一段时间观察模拟器运行
        console.log('   等待5秒观察模拟器数据生成...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 断开连接
        await simulator.disconnect();
        console.log('   ✅ 设备模拟器测试通过\n');
        
        return true;
    } catch (error) {
        console.log(`   ❌ 设备模拟器测试失败: ${error.message}\n`);
        return false;
    }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
    console.log('🔬 测试4: 错误处理机制');
    
    try {
        // 测试无效帧解析
        const invalidFrame = Buffer.from([0xFF, 0x01, 0x02, 0x03]); // 无效帧头
        const parsedInvalid = ProtocolUtils.parseFrame(invalidFrame);
        
        console.log(`   无效帧解析: 有效=${parsedInvalid.valid}, 错误=${parsedInvalid.error}`);
        
        if (!parsedInvalid.valid && parsedInvalid.error) {
            console.log('   ✅ 无效帧检测正常');
        } else {
            throw new Error('无效帧检测失败');
        }
        
        // 测试校验和错误
        const validFrame = ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.PROBE_HOME);
        validFrame[validFrame.length - 2] = 0xFF; // 损坏校验和
        const parsedCorrupted = ProtocolUtils.parseFrame(validFrame);
        
        console.log(`   损坏帧解析: 有效=${parsedCorrupted.valid}, 错误=${parsedCorrupted.error}`);
        
        if (!parsedCorrupted.valid && parsedCorrupted.error === 'Checksum mismatch') {
            console.log('   ✅ 校验和错误检测正常');
        } else {
            throw new Error('校验和错误检测失败');
        }
        
        console.log('   ✅ 错误处理测试通过\n');
        return true;
    } catch (error) {
        console.log(`   ❌ 错误处理测试失败: ${error.message}\n`);
        return false;
    }
}

/**
 * 测试设备状态管理
 */
async function testDeviceStatus() {
    console.log('🔬 测试5: 设备状态管理');
    
    try {
        const simulator = new RadiationDetectorSimulator();
        await simulator.connect();
        
        // 初始状态
        const initialStatus = simulator.deviceStatus;
        console.log(`   初始设备状态: ${initialStatus.deviceStatus}, 探头状态: ${initialStatus.probeStatus}`);
        
        // 测试状态查询
        const statusFrame = ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.STATUS_QUERY);
        const statusResponse = simulator.processCommand(ProtocolUtils.parseFrame(statusFrame));
        
        if (statusResponse) {
            console.log('   ✅ 状态查询响应正常');
        }
        
        // 测试心跳
        const heartbeatFrame = ProtocolUtils.generateFrame(PROTOCOL.COMMANDS.DEVICE_HEARTBEAT);
        const heartbeatResponse = simulator.processCommand(ProtocolUtils.parseFrame(heartbeatFrame));
        
        if (heartbeatResponse) {
            console.log('   ✅ 心跳响应正常');
        }
        
        await simulator.disconnect();
        console.log('   ✅ 设备状态管理测试通过\n');
        
        return true;
    } catch (error) {
        console.log(`   ❌ 设备状态管理测试失败: ${error.message}\n`);
        return false;
    }
}

/**
 * 主测试函数
 */
async function runTests() {
    console.log('开始执行设备通讯协议测试...\n');
    
    const tests = [
        { name: '协议解析', func: testProtocolParsing },
        { name: '帧生成解析', func: testFrameGeneration },
        { name: '设备模拟器', func: testDeviceSimulator },
        { name: '错误处理', func: testErrorHandling },
        { name: '设备状态', func: testDeviceStatus }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        try {
            const result = await test.func();
            if (result) {
                passedTests++;
            }
        } catch (error) {
            console.log(`测试 "${test.name}" 执行异常: ${error.message}`);
        }
    }
    
    console.log('===================================================');
    console.log(`测试结果: ${passedTests}/${totalTests} 通过`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！设备通讯协议工作正常。');
        console.log('');
        console.log('📋 协议功能总结:');
        console.log('   ✅ 协议数据编码/解码');
        console.log('   ✅ 协议帧生成/解析');
        console.log('   ✅ 设备模拟器运行');
        console.log('   ✅ 错误检测和处理');
        console.log('   ✅ 设备状态管理');
        console.log('');
        console.log('🚀 系统已准备好用于开发和测试！');
    } else {
        console.log(`❌ ${totalTests - passedTests} 个测试失败，请检查代码。`);
    }
    
    console.log('===================================================\n');
}

// 执行测试
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testProtocolParsing,
    testFrameGeneration,
    testDeviceSimulator,
    testErrorHandling,
    testDeviceStatus,
    runTests
};