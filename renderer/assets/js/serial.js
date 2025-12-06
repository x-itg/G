// 串口通信模块 - 修复版本
window.SerialModule = {
    isConnected: false,
    isConnecting: false,
    dataBuffer: [],
    currentConfig: {
        com2: null,
        com3: null
    },
    measurementActive: false,
    measurementStartTime: null,
    
    // 初始化串口模块
    init() {
        this.setupEventListeners();
        this.loadSavedConfiguration();
        this.updateConnectionStatus();
        console.log('串口通信模块已初始化');
    },
    
    // 设置事件监听器
    setupEventListeners() {
        // 连接/断开按钮
        const connectBtn = document.getElementById('connect-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connect());
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }
    },

    // 连接设备
    async connect() {
        if (this.isConnected || this.isConnecting) {
            return;
        }

        try {
            this.isConnecting = true;
            this.updateConnectionStatus();
            
            console.log('正在连接设备...');
            
            // 模拟连接成功
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.isConnected = true;
            this.isConnecting = false;
            this.updateConnectionStatus();
            
            console.log('设备连接成功');
        } catch (error) {
            console.error('连接失败:', error);
            this.isConnecting = false;
            this.updateConnectionStatus();
        }
    },
    
    // 断开连接
    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            this.isConnected = false;
            this.updateConnectionStatus();
            console.log('设备已断开连接');
        } catch (error) {
            console.error('断开连接失败:', error);
        }
    },

    // 更新连接状态
    updateConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        if (this.isConnecting) {
            statusElement.textContent = '连接中...';
        } else if (this.isConnected) {
            statusElement.textContent = '已连接';
        } else {
            statusElement.textContent = '未连接';
        }
    },

    // 加载保存的配置
    loadSavedConfiguration() {
        try {
            const saved = localStorage.getItem('serialConfig');
            if (saved) {
                this.currentConfig = JSON.parse(saved);
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    },

    // 保存配置
    saveConfiguration() {
        localStorage.setItem('serialConfig', JSON.stringify(this.currentConfig));
    }
};

// 监听连接状态变化
document.addEventListener('connectionStatusChange', (event) => {
    console.log('连接状态变化:', event.detail);
});

console.log('串口通信模块已加载');