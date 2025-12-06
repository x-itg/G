const ElectronicSignatureService = require('./electronicSignature');
const SimplifiedDatabaseManager = require('../database/SimplifiedDatabaseManager');

/**
 * 简化的电子签名测试
 * 用于调试和验证基础功能
 */
async function simpleTest() {
    console.log('🔍 简化电子签名测试\n');
    
    try {
        const dbManager = new SimplifiedDatabaseManager();
        dbManager.initialize();
        
        const signatureService = new ElectronicSignatureService(dbManager);
        
        // 创建测试用户
        console.log('1. 创建测试用户...');
        const testUser = dbManager.createUser({
            username: 'debug.user',
            password: 'DebugPass123!',
            fullName: '调试用户',
            title: '测试专员',
            department: '测试部',
            role: 'ADMIN'
        });
        console.log(`✅ 用户创建成功: ${testUser.id} (${testUser.username})`);
        
        // 检查用户是否正确创建
        console.log('\n2. 检查用户创建...');
        const retrievedUser = dbManager.getUserById(testUser.id);
        console.log(`✅ 用户检索成功: ${retrievedUser.username}`);
        
        // 创建电子签名
        console.log('\n3. 创建电子签名...');
        const signatureRequest = {
            userId: testUser.id,
            operation: 'DATA_DELETION',
            entityId: 'debug-entity-001',
            entityType: 'DebugEntity',
            reason: '调试测试删除',
            comment: '这是一个调试测试',
            password: 'DebugPass123!',
            secondPassword: 'DebugPass123!',
            ipAddress: '127.0.0.1',
            userAgent: 'DebugAgent/1.0'
        };
        
        const signatureResult = await signatureService.createElectronicSignature(signatureRequest);
        console.log(`✅ 签名创建成功:`);
        console.log(`   - 签名ID: ${signatureResult.signatureId}`);
        console.log(`   - 是否成功: ${signatureResult.success}`);
        console.log(`   - 签名记录:`, signatureResult.signatureRecord);
        
        // 检查签名是否正确保存
        console.log('\n4. 检查签名保存...');
        const allSignatures = dbManager.readTable('electronic_signatures');
        console.log(`✅ 电子签名表共有 ${allSignatures.length} 条记录`);
        
        const savedSignature = allSignatures.find(sig => sig.id === signatureResult.signatureId);
        if (savedSignature) {
            console.log(`✅ 找到保存的签名记录:`);
            console.log(`   - 用户: ${savedSignature.user_full_name}`);
            console.log(`   - 操作: ${savedSignature.action}`);
            console.log(`   - 原因: ${savedSignature.reason}`);
            console.log(`   - 时间: ${savedSignature.signed_at}`);
        } else {
            console.log(`❌ 未找到签名记录: ${signatureResult.signatureId}`);
        }
        
        // 验证电子签名
        console.log('\n5. 验证电子签名...');
        const verificationToken = signatureService.generateVerificationToken(signatureResult.signatureRecord);
        const verificationResult = await signatureService.verifyElectronicSignature(
            signatureResult.signatureId,
            verificationToken
        );
        console.log(`✅ 签名验证结果:`);
        console.log(`   - 有效性: ${verificationResult.valid}`);
        console.log(`   - 消息: ${verificationResult.message}`);
        
        // 检查审计记录
        console.log('\n6. 检查审计记录...');
        const auditRecords = dbManager.readTable('signature_audit');
        console.log(`✅ 审计表共有 ${auditRecords.length} 条记录`);
        
        if (auditRecords.length > 0) {
            const latestAudit = auditRecords[auditRecords.length - 1];
            console.log(`最新审计记录:`);
            console.log(`   - 签名ID: ${latestAudit.signature_id}`);
            console.log(`   - 验证结果: ${latestAudit.verification_result}`);
            console.log(`   - 合规状态: ${latestAudit.compliance_status}`);
        }
        
        console.log('\n🎉 简化测试完成！');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

simpleTest();