# 数据库架构验证报告

**生成时间**: 2025-12-06T09:17:38.388Z
**总体状态**: PASSED_WITH_WARNINGS

## 表验证结果

### users
- **状态**: PASSED
- **记录数**: 42
- **字段数**: 11

### measurements
- **状态**: FAILED
- **记录数**: 0
- **字段数**: 0

### system_settings
- **状态**: FAILED
- **记录数**: 0
- **字段数**: 0

### user_permissions
- **状态**: PASSED
- **记录数**: 43
- **字段数**: 11

### audit_logs
- **状态**: PASSED
- **记录数**: 49
- **字段数**: 18

### performance_metrics
- **状态**: PASSED
- **记录数**: 4827
- **字段数**: 9

### electronic_signatures
- **状态**: PASSED
- **记录数**: 27
- **字段数**: 15

## 发现的问题

- **MEDIUM**: 表 audit_logs 中的记录 6c202710-04fb-4636-8bba-672377951452 引用了不存在的 users.id: system
- **MEDIUM**: 表 audit_logs 中的记录 d33942ba-ec04-48dc-8bba-f595017a0099 引用了不存在的 users.id: system
- **MEDIUM**: 表 audit_logs 中的记录 50963c35-f52a-4b22-b581-028d29cb7471 引用了不存在的 users.id: system
- **MEDIUM**: 表 audit_logs 中的记录 ed456323-93f3-423a-9506-16a85d1335f9 引用了不存在的 users.id: system
- **MEDIUM**: 表 audit_logs 中的记录 15fe9304-7a90-4691-b284-0ced6e924005 引用了不存在的 users.id: system
- **MEDIUM**: 表 audit_logs 中的记录 8049abfb-b086-4e97-ae5c-05a3af9b6378 引用了不存在的 users.id: system
- **MEDIUM**: 表 audit_logs 中的记录 dc292abc-488f-4b00-b72c-2fa1f183e4f5 引用了不存在的 users.id: system
- **MEDIUM**: 表 audit_logs 中的记录 127b3ee5-bb03-413e-8aaa-e05c5c3551c3 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 f529e84f-bb7a-4a2d-9269-ff56c756e791 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 cf1be1ef-1b2e-43fc-9233-8fc893e7c01a 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 448cb41e-2a81-47a5-b953-63a5f35f5225 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 dca22efd-6d26-42c6-85fd-c07b5cff9be5 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 57e33385-3343-4358-9215-3353629b4fe8 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 7d6ed78b-cf54-48ec-a5fd-934131bc9770 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 f2f94556-ca25-44e7-ad33-4db647b08c80 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 99e098b3-debe-4e97-b731-586879f9e138 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 cbe6c1ba-466e-41cb-9b4e-68ed4792062c 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 fd15fca0-9a99-48e5-b9c3-6c4cf834d6bb 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 1cdc0c0a-085b-4d03-a2a9-f8a107adcbcb 引用了不存在的 users.id: system_monitor
- **MEDIUM**: 表 audit_logs 中的记录 f1c914c9-8bed-4b12-bc2c-61f0408c5722 引用了不存在的 electronic_signatures.id: SIG-1765008114121-75DBE3437FE24DA0
- **MEDIUM**: 表 audit_logs 中的记录 89cb957b-fa10-4bc9-acf4-6a0895727943 引用了不存在的 electronic_signatures.id: SIG-1765008114503-AFD3D3CE5D920D79
- **MEDIUM**: 表 audit_logs 中的记录 5436e392-06c1-4095-b11c-925deff5d664 引用了不存在的 electronic_signatures.id: SIG-1765008114643-A5BBB6520E91AA20
- **MEDIUM**: 表 audit_logs 中的记录 db45db76-b29f-40cf-b280-99b79caf2033 引用了不存在的 electronic_signatures.id: SIG-1765008114715-B6AEC81681313582
- **MEDIUM**: 表 audit_logs 中的记录 466c604e-2d62-4d7b-b2e8-cd3749a84ff9 引用了不存在的 electronic_signatures.id: SIG-1765008114795-A69CE4397DA988E1
- **MEDIUM**: 表 audit_logs 中的记录 ef3d15fd-e1fc-4693-95ce-f56eba60eed9 引用了不存在的 electronic_signatures.id: SIG-1765008114940-1F35F4F5383D01B7
- **MEDIUM**: 表 audit_logs 中的记录 23d9fbcb-299b-4221-a025-0fdc11347285 引用了不存在的 electronic_signatures.id: SIG-1765008182876-36E11BE7705B1B43
- **MEDIUM**: 表 audit_logs 中的记录 47295d9a-b067-49ed-8d0c-393233624192 引用了不存在的 electronic_signatures.id: SIG-1765008183258-CE918167871804FA
- **MEDIUM**: 表 audit_logs 中的记录 f5489c8b-5be9-4182-95ab-5e12388509e9 引用了不存在的 electronic_signatures.id: SIG-1765008183401-A344FBFCF2AB798C
- **MEDIUM**: 表 audit_logs 中的记录 31d29965-2988-4d4f-b796-8b15d3c4e6ca 引用了不存在的 electronic_signatures.id: SIG-1765008183477-BCA801FFEFB5C001
- **MEDIUM**: 表 audit_logs 中的记录 065c94f7-0786-4d16-9131-051816299a9b 引用了不存在的 electronic_signatures.id: SIG-1765008183553-0221A5FF711C3318
- **MEDIUM**: 表 audit_logs 中的记录 0c202236-390d-4a79-b6b4-bf72d60678ee 引用了不存在的 electronic_signatures.id: SIG-1765008183699-C6DA2194A5B62021
- **MEDIUM**: 表 audit_logs 中的记录 f1de4b8e-1ac9-453c-bf61-6b0cfbe9a88f 引用了不存在的 electronic_signatures.id: SIG-1765008222575-3CF3CAF180C61BAC
- **MEDIUM**: 表 audit_logs 中的记录 c75fb26f-3dc2-4885-a724-429bff13fda3 引用了不存在的 electronic_signatures.id: SIG-1765008222984-374F5BD5E61A9045
- **MEDIUM**: 表 audit_logs 中的记录 6e9a7986-cc9e-4ef5-bdc5-0a4f41461bac 引用了不存在的 electronic_signatures.id: SIG-1765008223179-6E8F8E56A1DBAFE6
- **MEDIUM**: 表 audit_logs 中的记录 e273834b-67ef-4f29-8910-538b5cf9b903 引用了不存在的 electronic_signatures.id: SIG-1765008223307-9BAE2D533224FBFF
- **MEDIUM**: 表 audit_logs 中的记录 dd900825-0c1f-4935-b6e6-a0744c4f7b01 引用了不存在的 electronic_signatures.id: SIG-1765008223432-965D76918F3E139C
- **MEDIUM**: 表 audit_logs 中的记录 46df4fee-f9e0-48a2-a5bc-30daf900a4eb 引用了不存在的 electronic_signatures.id: SIG-1765008223585-91C09AD4EB7187F6
- **MEDIUM**: 表 audit_logs 中的记录 b4e10d16-5180-4f3f-8b9c-7c614d422527 引用了不存在的 electronic_signatures.id: SIG-1765008244679-57725313CDF3D5E0

## 改进建议

- **MEDIUM**: 发现 38 个中优先级问题，建议优化
  - 建议操作: 检查并修复数据质量问题

