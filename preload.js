const { contextBridge, ipcRenderer } = require('electron');

// 安全的API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 用户认证
    auth: {
        login: (credentials) => ipcRenderer.invoke('auth-login', credentials),
        logout: () => ipcRenderer.invoke('auth-logout'),
    },

    // 串口通信
    serial: {
        configure: (config) => ipcRenderer.invoke('serial-configure', config),
        connect: () => ipcRenderer.invoke('serial-connect'),
        disconnect: () => ipcRenderer.invoke('serial-disconnect'),
        moveProbe: (position) => ipcRenderer.invoke('probe-move', position),
        homeProbe: () => ipcRenderer.invoke('probe-home'),
        onDataReceived: (callback) => ipcRenderer.on('serial-data-received', callback),
        removeDataListener: (callback) => ipcRenderer.removeListener('serial-data-received', callback)
    },

    // 电子签名
    signature: {
        sign: (signatureData) => ipcRenderer.invoke('electronic-signature', signatureData),
    },

    // 审计日志
    audit: {
        getLogs: (filters) => ipcRenderer.invoke('audit-get-logs', filters),
    },

    // 数据管理
    data: {
        saveAnalysis: (analysisData) => ipcRenderer.invoke('data-save-analysis', analysisData),
    },

    // 用户管理（管理员功能）
    user: {
        create: (userData) => ipcRenderer.invoke('user-create', userData),
        delete: (userId) => ipcRenderer.invoke('user-delete', userId),
        list: () => ipcRenderer.invoke('user-list'),
    },

    // 菜单事件监听
    menu: {
        onNewAnalysis: (callback) => ipcRenderer.on('menu-new-analysis', callback),
        onOpenData: (callback) => ipcRenderer.on('menu-open-data', callback),
        onSaveData: (callback) => ipcRenderer.on('menu-save-data', callback),
        onExportReport: (callback) => ipcRenderer.on('menu-export-report', callback),
        onSerialConfig: (callback) => ipcRenderer.on('menu-serial-config', callback),
        onConnectDevices: (callback) => ipcRenderer.on('menu-connect-devices', callback),
        onDisconnectDevices: (callback) => ipcRenderer.on('menu-disconnect-devices', callback),
        onStartAnalysis: (callback) => ipcRenderer.on('menu-start-analysis', callback),
        onStopAnalysis: (callback) => ipcRenderer.on('menu-stop-analysis', callback),
        onResetData: (callback) => ipcRenderer.on('menu-reset-data', callback),
        onUserManagement: (callback) => ipcRenderer.on('menu-user-management', callback),
        onAuditLog: (callback) => ipcRenderer.on('menu-audit-log', callback),
        onDeviceManagement: (callback) => ipcRenderer.on('menu-device-management', callback),
        onSystemValidation: (callback) => ipcRenderer.on('menu-system-validation', callback),
        onSettings: (callback) => ipcRenderer.on('menu-settings', callback),
    },

    // 移除菜单事件监听器
    menuRemove: {
        newAnalysis: (callback) => ipcRenderer.removeListener('menu-new-analysis', callback),
        openData: (callback) => ipcRenderer.removeListener('menu-open-data', callback),
        saveData: (callback) => ipcRenderer.removeListener('menu-save-data', callback),
        exportReport: (callback) => ipcRenderer.removeListener('menu-export-report', callback),
        serialConfig: (callback) => ipcRenderer.removeListener('menu-serial-config', callback),
        connectDevices: (callback) => ipcRenderer.removeListener('menu-connect-devices', callback),
        disconnectDevices: (callback) => ipcRenderer.removeListener('menu-disconnect-devices', callback),
        startAnalysis: (callback) => ipcRenderer.removeListener('menu-start-analysis', callback),
        stopAnalysis: (callback) => ipcRenderer.removeListener('menu-stop-analysis', callback),
        resetData: (callback) => ipcRenderer.removeListener('menu-reset-data', callback),
        userManagement: (callback) => ipcRenderer.removeListener('menu-user-management', callback),
        auditLog: (callback) => ipcRenderer.removeListener('menu-audit-log', callback),
        deviceManagement: (callback) => ipcRenderer.removeListener('menu-device-management', callback),
        systemValidation: (callback) => ipcRenderer.removeListener('menu-system-validation', callback),
        settings: (callback) => ipcRenderer.removeListener('menu-settings', callback),
    }
});

// 全局变量
window.radiationDetector = {
    version: '1.0.0',
    compliance: 'CFR 21 Part 11',
    created: new Date().toISOString()
};

console.log('放射检测仪预加载脚本已加载');
console.log('CFR 21 Part 11 合规系统已启动');