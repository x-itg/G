// 工具函数库
window.Utils = {
    // 初始化方法
    init() {
        console.log('工具函数库已初始化');
        // 检查moment库是否存在
        if (typeof moment === 'undefined') {
            console.warn('moment库未加载，某些时间格式化功能可能不可用');
        }
    },
    // 格式化日期时间
    formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!date) return '';
        return moment(date).format(format);
    },

    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        return moment(date).format(format);
    },

    // 格式化时间
    formatTime(date, format = 'HH:mm:ss') {
        if (!date) return '';
        return moment(date).format(format);
    },

    // 格式化持续时间
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    },

    // 格式化数字（千分位）
    formatNumber(num, decimals = 0) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return Number(num).toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    // 格式化计数率
    formatCountRate(counts) {
        if (!counts || counts < 0) return '0';
        return this.formatNumber(counts, 1);
    },

    // 格式化百分比
    formatPercentage(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) return '0%';
        return `${this.formatNumber(value, decimals)}%`;
    },

    // 格式化位置
    formatPosition(position, decimals = 1) {
        if (!position || position < 0) return '0.0';
        return this.formatNumber(position, decimals);
    },

    // 生成唯一ID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // 深度克隆对象
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },

    // 防抖函数
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 验证邮箱格式
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // 验证密码强度
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const errors = [];
        if (password.length < minLength) {
            errors.push(`密码至少需要${minLength}个字符`);
        }
        if (!hasUpperCase) {
            errors.push('密码必须包含至少一个大写字母');
        }
        if (!hasLowerCase) {
            errors.push('密码必须包含至少一个小写字母');
        }
        if (!hasNumbers) {
            errors.push('密码必须包含至少一个数字');
        }
        if (!hasSpecialChar) {
            errors.push('密码必须包含至少一个特殊字符');
        }

        return {
            isValid: errors.length === 0,
            errors,
            score: [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
        };
    },

    // 验证端口号
    validatePort(port) {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
    },

    // 验证数值范围
    validateRange(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    },

    // 数组求和
    arraySum(array, key = null) {
        if (!Array.isArray(array) || array.length === 0) return 0;
        
        if (key) {
            return array.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
        } else {
            return array.reduce((sum, item) => sum + (parseFloat(item) || 0), 0);
        }
    },

    // 数组求平均值
    arrayAverage(array, key = null) {
        if (!Array.isArray(array) || array.length === 0) return 0;
        return this.arraySum(array, key) / array.length;
    },

    // 数组求最大值
    arrayMax(array, key = null) {
        if (!Array.isArray(array) || array.length === 0) return 0;
        
        if (key) {
            return Math.max(...array.map(item => parseFloat(item[key]) || 0));
        } else {
            return Math.max(...array.map(item => parseFloat(item) || 0));
        }
    },

    // 数组求最小值
    arrayMin(array, key = null) {
        if (!Array.isArray(array) || array.length === 0) return 0;
        
        if (key) {
            return Math.min(...array.map(item => parseFloat(item[key]) || 0));
        } else {
            return Math.min(...array.map(item => parseFloat(item) || 0));
        }
    },

    // 线性插值
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },

    // 计算两点间距离
    distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    // 计算相关系数
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) return 0;
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    },

    // 数据平滑（移动平均）
    smoothData(data, windowSize = 5) {
        if (data.length < windowSize) return data;
        
        const smoothed = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
            const window = data.slice(start, end);
            smoothed.push(window.reduce((sum, val) => sum + val, 0) / window.length);
        }
        return smoothed;
    },

    // 峰值检测
    detectPeaks(data, minHeight = 0, minDistance = 5) {
        const peaks = [];
        const threshold = minHeight;
        
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && 
                data[i] > data[i + 1] && 
                data[i] >= threshold) {
                
                // 检查最小距离
                const lastPeak = peaks[peaks.length - 1];
                if (!lastPeak || i - lastPeak.index >= minDistance) {
                    peaks.push({
                        index: i,
                        value: data[i]
                    });
                }
            }
        }
        
        return peaks;
    },

    // 基线校正
    baselineCorrection(data, method = 'linear') {
        if (data.length < 2) return data;
        
        switch (method) {
            case 'linear':
                // 线性基线校正
                const first = data[0];
                const last = data[data.length - 1];
                const slope = (last - first) / (data.length - 1);
                
                return data.map((value, index) => value - (first + slope * index));
                
            case 'average':
                // 平均基线校正
                const avg = this.arrayAverage(data);
                return data.map(value => value - avg);
                
            case 'minimum':
                // 最小值基线校正
                const min = this.arrayMin(data);
                return data.map(value => value - min);
                
            default:
                return data;
        }
    },

    // 数值格式化（科学计数法）
    formatScientific(number, decimals = 2) {
        if (number === 0) return '0';
        if (Math.abs(number) < 0.001 || Math.abs(number) > 1000000) {
            return number.toExponential(decimals);
        }
        return this.formatNumber(number, decimals);
    },

    // 颜色工具
    color: {
        // RGB转十六进制
        rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        },

        // 十六进制转RGB
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        // 颜色混合
        mix(color1, color2, ratio = 0.5) {
            const rgb1 = this.hexToRgb(color1);
            const rgb2 = this.hexToRgb(color2);
            
            if (!rgb1 || !rgb2) return color1;
            
            const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
            const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
            const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);
            
            return this.rgbToHex(r, g, b);
        }
    },

    // 文件操作
    file: {
        // 下载文件
        download(data, filename, type = 'text/plain') {
            const blob = new Blob([data], { type });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },

        // 下载JSON文件
        downloadJSON(data, filename) {
            const json = JSON.stringify(data, null, 2);
            this.download(json, filename, 'application/json');
        },

        // 下载CSV文件
        downloadCSV(data, filename, headers = []) {
            const csvContent = this.arrayToCSV(data, headers);
            this.download(csvContent, filename, 'text/csv');
        },

        // 数组转CSV
        arrayToCSV(data, headers = []) {
            if (!data || data.length === 0) return '';
            
            let csv = '';
            
            // 添加标题行
            if (headers.length > 0) {
                csv += headers.join(',') + '\n';
            }
            
            // 添加数据行
            data.forEach(row => {
                if (Array.isArray(row)) {
                    csv += row.join(',') + '\n';
                } else if (typeof row === 'object') {
                    const values = headers.map(header => row[header] || '');
                    csv += values.join(',') + '\n';
                }
            });
            
            return csv;
        }
    },

    // 缓存管理
    cache: {
        set(key, value, ttl = 300000) { // 默认5分钟
            const item = {
                value: value,
                expiry: Date.now() + ttl
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(item));
        },

        get(key) {
            const itemStr = localStorage.getItem(`cache_${key}`);
            if (!itemStr) return null;
            
            try {
                const item = JSON.parse(itemStr);
                if (Date.now() > item.expiry) {
                    localStorage.removeItem(`cache_${key}`);
                    return null;
                }
                return item.value;
            } catch (e) {
                localStorage.removeItem(`cache_${key}`);
                return null;
            }
        },

        remove(key) {
            localStorage.removeItem(`cache_${key}`);
        },

        clear() {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                }
            });
        }
    },

    // 性能监控
    performance: {
        mark(name) {
            if (performance.mark) {
                performance.mark(name);
            }
        },

        measure(name, startMark, endMark) {
            if (performance.measure) {
                try {
                    performance.measure(name, startMark, endMark);
                    const measures = performance.getEntriesByName(name);
                    return measures[0]?.duration || 0;
                } catch (e) {
                    return 0;
                }
            }
            return 0;
        },

        getMeasures() {
            return performance.getEntriesByType('measure') || [];
        }
    },

    // 事件工具
    events: {
        // 绑定一次性事件
        once(element, event, handler) {
            const onceHandler = (e) => {
                handler(e);
                element.removeEventListener(event, onceHandler);
            };
            element.addEventListener(event, onceHandler);
        },

        // 阻止事件冒泡
        stopPropagation(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            } else {
                e.cancelBubble = true;
            }
        },

        // 阻止默认行为
        preventDefault(e) {
            if (e.preventDefault) {
                e.preventDefault();
            } else {
                e.returnValue = false;
            }
        }
    },

    // DOM工具
    dom: {
        // 创建元素
        create(tag, className = '', innerHTML = '') {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (innerHTML) element.innerHTML = innerHTML;
            return element;
        },

        // 添加样式
        addStyle(css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            return style;
        },

        // 获取元素位置
        getPosition(element) {
            const rect = element.getBoundingClientRect();
            return {
                top: rect.top + window.pageYOffset,
                left: rect.left + window.pageXOffset,
                width: rect.width,
                height: rect.height
            };
        },

        // 元素是否在视口中
        isInViewport(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        }
    }
};

// 扩展Array.prototype
if (!Array.prototype.sum) {
    Array.prototype.sum = function() {
        return this.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    };
}

if (!Array.prototype.average) {
    Array.prototype.average = function() {
        return this.length > 0 ? this.sum() / this.length : 0;
    };
}

if (!Array.prototype.max) {
    Array.prototype.max = function() {
        return this.length > 0 ? Math.max(...this) : 0;
    };
}

if (!Array.prototype.min) {
    Array.prototype.min = function() {
        return this.length > 0 ? Math.min(...this) : 0;
    };
}

