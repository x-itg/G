// 图表和数据分析模块 - 性能优化版本
window.ChartModule = {
    chart: null,
    canvas: null,
    dataPoints: [],
    isInitialized: false,
    currentAnalysis: null,
    peakMarkers: [],
    integrationRegions: [],
    
    // 性能优化相关属性
    performanceConfig: {
        maxVisiblePoints: 2000,        // 最大可见数据点数量
        chunkSize: 1000,              // 数据分块大小
        cacheSize: 5000,              // 缓存大小
        enableVirtualScroll: true,    // 启用虚拟滚动
        enableDataAggregation: true,  // 启用数据聚合
        aggregationThreshold: 100,    // 聚合阈值（超过此数量的数据点进行聚合）
        debounceDelay: 300,           // 防抖延迟
        memoryCheckInterval: 30000,   // 内存检查间隔（毫秒）
        autoCleanup: true             // 自动清理
    },
    
    // 数据缓存系统
    dataCache: {
        aggregated: new Map(),        // 聚合数据缓存
        processed: new Map(),         // 处理后数据缓存
        viewport: new Map(),          // 视口数据缓存
        lastAccessed: new Map(),      // 最后访问时间
        maxSize: 5000,               // 最大缓存条目数
        ttl: 300000                  // 缓存生存时间（毫秒）
    },
    
    // 分页渲染相关
    pagination: {
        currentPage: 1,
        totalPages: 1,
        pageSize: 1000,
        totalItems: 0,
        isLoading: false
    },
    
    // 虚拟滚动相关
    virtualScroll: {
        isEnabled: false,
        visibleRange: { start: 0, end: 0 },
        bufferSize: 50,
        itemHeight: 1,
        containerHeight: 0,
        scrollTop: 0
    },
    
    // 渲染队列和优化
    renderQueue: [],
    isRendering: false,
    lastRenderTime: 0,
    renderInterval: 16, // 60fps目标
    memoryUsage: 0,
    lastMemoryCheck: 0,

    // 初始化图表
    init() {
        // 检查Chart.js是否加载
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js未加载，图表功能将被禁用');
            console.warn('这可能是由于CSP策略阻止了CDN脚本加载');
            console.warn('图表模块初始化跳过，系统将以有限功能模式运行');
            this.isInitialized = false;
            return;
        }

        this.canvas = document.getElementById('main-chart');
        if (!this.canvas) {
            ErrorHandler.handleError(new Error('找不到图表画布元素'), 'chart_canvas_not_found', {
                expectedId: 'main-chart',
                functionName: 'init'
            });
            return;
        }

        // 性能监控初始化
        this.initPerformanceMonitoring();
        
        // 初始化缓存系统
        this.initDataCache();
        
        // 创建优化后的图表
        this.createOptimizedChart();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 启动性能优化机制
        this.startPerformanceOptimizations();
        
        this.isInitialized = true;
        
        console.log('图表模块已初始化 - 性能优化版本');
    },

    // 初始化性能监控
    initPerformanceMonitoring() {
        if (performance.memory) {
            this.memoryMonitor = setInterval(() => {
                this.checkMemoryUsage();
            }, this.performanceConfig.memoryCheckInterval);
        }
    },

    // 检查内存使用情况
    checkMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            this.memoryUsage = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
            };
            
            // 内存使用超过80%时触发清理
            if (this.memoryUsage.percentage > 80) {
                this.cleanupMemory();
            }
        }
    },

    // 内存清理
    cleanupMemory() {
        console.log('执行内存清理...');
        
        // 清理缓存
        this.clearOldCache();
        
        // 清理渲染队列
        this.renderQueue = [];
        
        // 强制垃圾回收（如果支持）
        if (window.gc && this.memoryUsage.percentage > 90) {
            window.gc();
        }
        
        // 重新计算聚合数据
        if (this.dataPoints.length > this.performanceConfig.aggregationThreshold) {
            this.rebuildAggregatedData();
        }
        
        Auth.log('内存清理完成', 'info');
    },

    // 初始化数据缓存系统
    initDataCache() {
        this.dataCache.aggregated.clear();
        this.dataCache.processed.clear();
        this.dataCache.viewport.clear();
        this.dataCache.lastAccessed.clear();
        
        // 设置缓存清理定时器
        setInterval(() => {
            this.cleanupCache();
        }, 60000); // 每分钟清理一次
    },

    // 缓存清理
    cleanupCache() {
        const now = Date.now();
        const maxAge = this.dataCache.ttl;
        
        // 清理过期的聚合数据缓存
        for (const [key, data] of this.dataCache.aggregated.entries()) {
            const lastAccess = this.dataCache.lastAccessed.get(key) || 0;
            if (now - lastAccess > maxAge) {
                this.dataCache.aggregated.delete(key);
                this.dataCache.lastAccessed.delete(key);
            }
        }
        
        // 限制缓存大小
        this.enforceCacheSize();
    },

    // 强制执行缓存大小限制
    enforceCacheSize() {
        const totalEntries = this.dataCache.aggregated.size + 
                           this.dataCache.processed.size + 
                           this.dataCache.viewport.size;
        
        if (totalEntries > this.dataCache.maxSize) {
            // 删除最久未使用的条目
            const entries = Array.from(this.dataCache.lastAccessed.entries())
                .sort((a, b) => a[1] - b[1])
                .slice(0, totalEntries - this.dataCache.maxSize);
            
            entries.forEach(([key]) => {
                this.dataCache.aggregated.delete(key);
                this.dataCache.processed.delete(key);
                this.dataCache.viewport.delete(key);
                this.dataCache.lastAccessed.delete(key);
            });
        }
    },

    // 创建优化后的Chart.js图表
    createOptimizedChart() {
        // 如果图表已存在，先销毁
        if (this.chart) {
            try {
                this.chart.destroy();
                console.log('已销毁现有图表实例');
            } catch (error) {
                console.warn('销毁图表时出错:', error);
            }
            this.chart = null;
        }

        // 检查 canvas 是否被其他图表实例使用
        const existingChart = Chart.getChart(this.canvas);
        if (existingChart) {
            try {
                existingChart.destroy();
                console.log('ChartModule: 销毁了其他模块的图表实例');
            } catch (error) {
                console.warn('ChartModule: 销毁其他图表时出错:', error);
            }
        }

        const ctx = this.canvas.getContext('2d');
        
        const config = {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: '计数率 (counts/s)',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        parsing: false, // 禁用解析以提高性能
                        spanGaps: false
                    },
                    {
                        label: '背景',
                        data: [],
                        borderColor: 'rgba(135, 206, 235, 0.8)',
                        backgroundColor: 'rgba(135, 206, 235, 0.3)',
                        borderWidth: 1,
                        fill: true,
                        tension: 0,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        parsing: false,
                        spanGaps: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // 禁用动画以提高性能
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'wheel'],
                interaction: {
                    intersect: false,
                    mode: 'nearest',
                    axis: 'x'
                },
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            font: {
                                size: 12
                            },
                            filter: (legendItem, chartData) => {
                                // 只显示有数据的图例
                                return chartData.datasets[legendItem.datasetIndex].data.length > 0;
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: false,
                        filter: (tooltipItem) => {
                            // 只显示有意义的工具提示
                            return tooltipItem.parsed.y !== null;
                        },
                        callbacks: {
                            title: (context) => {
                                const dataIndex = context[0].dataIndex;
                                const pageInfo = this.getPageInfo(dataIndex);
                                return `位置: ${context[0].parsed.x.toFixed(1)} mm (页面: ${pageInfo.page})`;
                            },
                            label: (context) => {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} counts/s`;
                            },
                            afterBody: (context) => {
                                // 显示性能信息（开发模式）
                                if (this.memoryUsage.percentage > 70) {
                                    return [`内存使用: ${this.memoryUsage.percentage.toFixed(1)}%`];
                                }
                                return [];
                            }
                        }
                    },
                    decimation: {
                        enabled: true,
                        algorithm: 'lttb',
                        samples: 1000 // 使用Largest-Triangle-Three-Buckets算法
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '位置 (mm)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            maxTicksLimit: 20 // 限制刻度数量
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: '计数率 (counts/s)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            maxTicksLimit: 15
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.1
                    }
                },
                // 性能优化配置
                parsing: false,
                normalized: true
            }
        };

        this.chart = new Chart(ctx, config);
        
        // 添加性能监控
        this.chart.options.onProgress = (e) => {
            this.lastRenderTime = Date.now();
        };
        
        console.log('优化后的图表已创建');
    },

    // 启动性能优化机制
    startPerformanceOptimizations() {
        // 启动数据预处理
        setInterval(() => {
            this.preprocessData();
        }, 5000);
        
        // 启动页面管理
        this.initPagination();
        
        // 启动虚拟滚动（如果启用）
        if (this.performanceConfig.enableVirtualScroll) {
            this.initVirtualScroll();
        }
        
        // 启动防抖更新
        this.setupDebouncedUpdates();
    },

    // 初始化分页系统
    initPagination() {
        this.pagination.totalItems = 0;
        this.pagination.totalPages = 1;
        this.pagination.currentPage = 1;
    },

    // 初始化虚拟滚动
    initVirtualScroll() {
        this.virtualScroll.isEnabled = true;
        this.virtualScroll.containerHeight = this.canvas.parentElement?.clientHeight || 400;
        
        // 监听滚动事件
        if (this.canvas.parentElement) {
            this.canvas.parentElement.addEventListener('scroll', 
                this.throttle(() => this.handleVirtualScroll(), 16)
            );
        }
    },

    // 处理虚拟滚动
    handleVirtualScroll() {
        if (!this.virtualScroll.isEnabled) return;
        
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const totalHeight = this.canvas.height;
        
        // 计算可见范围
        const startIndex = Math.floor((scrollTop / totalHeight) * this.dataPoints.length);
        const endIndex = Math.min(
            startIndex + Math.ceil((containerHeight / totalHeight) * this.dataPoints.length) + this.virtualScroll.bufferSize,
            this.dataPoints.length
        );
        
        this.virtualScroll.visibleRange = { start: Math.max(0, startIndex), end: endIndex };
        this.virtualScroll.scrollTop = scrollTop;
        
        // 更新视口缓存
        this.updateViewportCache();
    },

    // 更新视口缓存
    updateViewportCache() {
        const { start, end } = this.virtualScroll.visibleRange;
        const viewportKey = `${start}_${end}`;
        
        if (this.dataCache.viewport.has(viewportKey)) {
            return; // 使用缓存
        }
        
        const viewportData = this.dataPoints.slice(start, end);
        this.dataCache.viewport.set(viewportKey, viewportData);
        this.dataCache.lastAccessed.set(viewportKey, Date.now());
    },

    // 设置事件监听器
    setupEventListeners() {
        // 图表缩放控制
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const resetZoomBtn = document.getElementById('reset-zoom');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoom(1.2));
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
        }

        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', () => this.resetZoom());
        }

        // 标记拖拽
        this.setupMarkerDragging();

        // 鼠标事件
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    },

    // 设置标记拖拽
    setupMarkerDragging() {
        const markers = document.querySelectorAll('.chart-marker');
        
        markers.forEach(marker => {
            let isDragging = false;
            let startX = 0;
            let startLeft = 0;

            marker.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startLeft = parseFloat(marker.style.left) || 0;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const deltaX = e.clientX - startX;
                const newLeft = Math.max(0, Math.min(100, startLeft + deltaX));
                marker.style.left = `${newLeft}%`;

                // 更新数据
                const position = this.percentageToPosition(newLeft);
                marker.dataset.position = position;
                
                // 触发位置更新事件
                this.triggerMarkerMove(marker, position);
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    this.saveMarkerPosition(marker);
                }
            });
        });
    },

    // 处理鼠标移动
    handleMouseMove(e) {
        if (!this.chart) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 更新鼠标坐标显示
        this.updateMouseCoordinates(x, y);
    },

    // 处理画布点击
    handleCanvasClick(e) {
        if (!this.chart) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 获取实际数据坐标
        const dataX = this.chart.scales.x.getValueForPixel(x);
        const dataY = this.chart.scales.y.getValueForPixel(y);

        // 显示点击点的信息
        this.showDataPointInfo(dataX, dataY);
    },

    // 添加数据点（优化版本）
    addDataPoint(position, countRate, backgroundRate = 0) {
        if (!this.chart) return;

        const netCountRate = Math.max(0, countRate - backgroundRate);
        
        const dataPoint = {
            x: position,
            y: countRate,
            background: backgroundRate,
            netCountRate: netCountRate,
            timestamp: new Date(),
            id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // 批量添加以提高性能
        this.batchAddDataPoints([dataPoint]);
    },

    // 批量添加数据点
    batchAddDataPoints(dataPoints) {
        if (!Array.isArray(dataPoints) || dataPoints.length === 0) return;

        const startTime = performance.now();
        
        // 检查数据大小，决定处理策略
        if (dataPoints.length > this.performanceConfig.chunkSize) {
            // 大数据集分批处理
            this.processLargeDataset(dataPoints);
            return;
        }

        // 添加到数据点数组
        this.dataPoints.push(...dataPoints);

        // 更新分页信息
        this.updatePaginationInfo();

        // 触发优化更新
        this.scheduleOptimizedUpdate();

        const endTime = performance.now();
        console.log(`批量添加 ${dataPoints.length} 个数据点，耗时 ${(endTime - startTime).toFixed(2)}ms`);

        // 实时更新结果
        this.updateRealTimeResults();

        // 记录数据采集日志
        Auth.log(`批量采集数据: ${dataPoints.length}个点, 总数据量 ${this.dataPoints.length}个`, 'info');
    },

    // 处理大数据集
    processLargeDataset(dataPoints) {
        const chunkSize = this.performanceConfig.chunkSize;
        let index = 0;
        
        const processChunk = () => {
            const chunk = dataPoints.slice(index, index + chunkSize);
            this.dataPoints.push(...chunk);
            
            index += chunkSize;
            
            if (index < dataPoints.length) {
                // 使用requestAnimationFrame继续处理下一批
                requestAnimationFrame(processChunk);
            } else {
                // 处理完成
                this.updatePaginationInfo();
                this.scheduleOptimizedUpdate();
                this.updateRealTimeResults();
            }
        };
        
        processChunk();
    },

    // 更新分页信息
    updatePaginationInfo() {
        this.pagination.totalItems = this.dataPoints.length;
        this.pagination.totalPages = Math.ceil(this.pagination.totalItems / this.pagination.pageSize);
        
        // 如果数据量超过阈值，自动启用虚拟滚动
        if (this.dataPoints.length > this.performanceConfig.aggregationThreshold && 
            !this.virtualScroll.isEnabled) {
            this.initVirtualScroll();
        }
    },

    // 安排优化更新
    scheduleOptimizedUpdate() {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.updateChartDataOptimized();
        }, this.performanceConfig.debounceDelay);
    },

    // 数据预处理
    preprocessData() {
        if (this.dataPoints.length === 0) return;

        // 检查是否需要重新聚合
        const dataHash = this.generateDataHash();
        const cacheKey = `processed_${dataHash}`;
        
        if (this.dataCache.processed.has(cacheKey)) {
            return; // 已有处理后的缓存
        }

        const startTime = performance.now();
        
        // 数据排序和清理
        this.dataPoints.sort((a, b) => a.x - b.x);
        
        // 移除重复和无效数据
        this.cleanupDataPoints();
        
        // 数据聚合（如果需要）
        if (this.shouldAggregateData()) {
            this.aggregateData();
        }
        
        // 预处理完成，存储缓存
        this.dataCache.processed.set(cacheKey, true);
        this.dataCache.lastAccessed.set(cacheKey, Date.now());
        
        const endTime = performance.now();
        console.log(`数据预处理完成，耗时 ${(endTime - startTime).toFixed(2)}ms`);
    },

    // 生成数据哈希
    generateDataHash() {
        if (this.dataPoints.length === 0) return 'empty';
        return btoa(JSON.stringify({
            count: this.dataPoints.length,
            firstX: this.dataPoints[0]?.x,
            lastX: this.dataPoints[this.dataPoints.length - 1]?.x
        })).substr(0, 16);
    },

    // 清理数据点
    cleanupDataPoints() {
        const originalLength = this.dataPoints.length;
        
        // 移除无效数据
        this.dataPoints = this.dataPoints.filter(point => 
            point && 
            typeof point.x === 'number' && 
            typeof point.y === 'number' && 
            !isNaN(point.x) && 
            !isNaN(point.y)
        );
        
        // 移除重复数据点（相同x值）
        const uniquePoints = [];
        const seenX = new Set();
        
        for (const point of this.dataPoints) {
            if (!seenX.has(point.x)) {
                seenX.add(point.x);
                uniquePoints.push(point);
            }
        }
        
        this.dataPoints = uniquePoints;
        
        if (this.dataPoints.length !== originalLength) {
            console.log(`数据清理: ${originalLength} -> ${this.dataPoints.length} (移除 ${originalLength - this.dataPoints.length} 个无效/重复点)`);
        }
    },

    // 检查是否需要数据聚合
    shouldAggregateData() {
        return this.performanceConfig.enableDataAggregation && 
               this.dataPoints.length > this.performanceConfig.aggregationThreshold;
    },

    // 数据聚合
    aggregateData() {
        const dataHash = this.generateDataHash();
        const cacheKey = `aggregated_${dataHash}`;
        
        if (this.dataCache.aggregated.has(cacheKey)) {
            return; // 使用缓存的聚合数据
        }

        const startTime = performance.now();
        
        const aggregatedData = this.performDataAggregation();
        
        // 存储聚合数据
        this.dataCache.aggregated.set(cacheKey, aggregatedData);
        this.dataCache.lastAccessed.set(cacheKey, Date.now());
        
        const endTime = performance.now();
        console.log(`数据聚合完成: ${this.dataPoints.length} -> ${aggregatedData.length} 点，耗时 ${(endTime - startTime).toFixed(2)}ms`);
    },

    // 执行数据聚合
    performDataAggregation() {
        const targetPoints = this.performanceConfig.maxVisiblePoints;
        const step = Math.max(1, Math.floor(this.dataPoints.length / targetPoints));
        
        const aggregated = [];
        
        for (let i = 0; i < this.dataPoints.length; i += step) {
            const chunk = this.dataPoints.slice(i, i + step);
            if (chunk.length === 0) continue;
            
            // 计算聚合值（平均值）
            const avgX = chunk.reduce((sum, p) => sum + p.x, 0) / chunk.length;
            const avgY = chunk.reduce((sum, p) => sum + p.y, 0) / chunk.length;
            const avgBg = chunk.reduce((sum, p) => sum + p.background, 0) / chunk.length;
            
            aggregated.push({
                x: avgX,
                y: avgY,
                background: avgBg,
                netCountRate: Math.max(0, avgY - avgBg),
                timestamp: chunk[0].timestamp,
                aggregated: true,
                originalCount: chunk.length
            });
        }
        
        return aggregated;
    },

    // 重建聚合数据
    rebuildAggregatedData() {
        // 清除聚合缓存
        this.dataCache.aggregated.clear();
        
        // 重新聚合
        if (this.shouldAggregateData()) {
            this.aggregateData();
        }
    },

    // 获取页面信息
    getPageInfo(dataIndex) {
        const pageSize = this.pagination.pageSize;
        const page = Math.floor(dataIndex / pageSize) + 1;
        const pageIndex = dataIndex % pageSize;
        
        return {
            page,
            pageIndex,
            pageSize,
            totalPages: this.pagination.totalPages
        };
    },

    // 更新图表数据（优化版本）
    updateChartDataOptimized() {
        if (!this.chart || this.dataPoints.length === 0) return;

        const startTime = performance.now();
        
        // 检查是否可以使用缓存数据
        const workingData = this.getWorkingDataSet();
        if (!workingData) {
            console.warn('无法获取工作数据集');
            return;
        }

        const { mainData, backgroundData } = this.prepareChartData(workingData);

        // 使用批量更新减少重绘次数
        this.batchUpdateChart(mainData, backgroundData, workingData);

        const endTime = performance.now();
        console.log(`图表数据更新完成: ${workingData.length} 点，耗时 ${(endTime - startTime).toFixed(2)}ms`);
    },

    // 获取工作数据集（聚合或原始）
    getWorkingDataSet() {
        if (this.shouldAggregateData()) {
            const dataHash = this.generateDataHash();
            const cacheKey = `aggregated_${dataHash}`;
            
            const aggregatedData = this.dataCache.aggregated.get(cacheKey);
            if (aggregatedData) {
                return aggregatedData;
            }
            
            // 如果没有缓存，进行聚合
            return this.performDataAggregation();
        }
        
        return this.dataPoints;
    },

    // 准备图表数据
    prepareChartData(dataSet) {
        const mainData = new Array(dataSet.length);
        const backgroundData = new Array(dataSet.length);

        for (let i = 0; i < dataSet.length; i++) {
            const point = dataSet[i];
            mainData[i] = { x: point.x, y: point.y };
            backgroundData[i] = { x: point.x, y: point.background };
        }

        return { mainData, backgroundData };
    },

    // 批量更新图表
    batchUpdateChart(mainData, backgroundData, dataSet) {
        if (!this.chart) return;

        // 冻结图表更新以提高性能
        this.chart.options.animation = false;
        this.chart.options.events = []; // 临时禁用事件

        // 更新数据集
        this.chart.data.datasets[0].data = mainData;
        this.chart.data.datasets[1].data = backgroundData;

        // 更新范围（使用缓存的值）
        const xValues = dataSet.map(p => p.x);
        const yValues = dataSet.map(p => p.y);

        if (xValues.length > 0) {
            this.chart.options.scales.x.min = Math.min(...xValues) - 5;
            this.chart.options.scales.x.max = Math.max(...xValues) + 5;
        }

        if (yValues.length > 0) {
            this.chart.options.scales.y.min = 0;
            this.chart.options.scales.y.max = Math.max(...yValues) * 1.1;
        }

        // 使用requestAnimationFrame进行渲染
        requestAnimationFrame(() => {
            this.chart.update('none');
            
            // 恢复图表交互
            this.chart.options.animation = false;
            this.chart.options.events = ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'wheel'];
        });
    },

    // 防抖更新
    setupDebouncedUpdates() {
        this.updateChartData = this.debounce(() => {
            this.updateChartDataOptimized();
        }, this.performanceConfig.debounceDelay);
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 获取性能统计信息
    getPerformanceStats() {
        return {
            dataPoints: this.dataPoints.length,
            cachedAggregated: this.dataCache.aggregated.size,
            cachedProcessed: this.dataCache.processed.size,
            cachedViewport: this.dataCache.viewport.size,
            pagination: { ...this.pagination },
            virtualScroll: { ...this.virtualScroll },
            memory: this.memoryUsage,
            renderQueue: this.renderQueue.length,
            lastRenderTime: this.lastRenderTime
        };
    },

    // 清除旧缓存
    clearOldCache() {
        const cacheTypes = ['aggregated', 'processed', 'viewport'];
        const maxAge = this.dataCache.ttl;
        const now = Date.now();
        
        cacheTypes.forEach(cacheType => {
            const cache = this.dataCache[cacheType];
            const cacheEntries = Array.from(cache.entries());
            
            cacheEntries.forEach(([key, data]) => {
                const lastAccess = this.dataCache.lastAccessed.get(key) || 0;
                if (now - lastAccess > maxAge) {
                    cache.delete(key);
                    this.dataCache.lastAccessed.delete(key);
                }
            });
        });
        
        this.enforceCacheSize();
    },

    // 执行分析
    async analyze() {
        if (this.dataPoints.length < 3) {
            UI.showAlert('数据不足', '请先采集足够的数据点进行分析', 'warning');
            return;
        }

        try {
            UI.showLoading('正在进行数据分析...');

            // 执行各种分析
            const analysisResults = {
                peaks: this.detectPeaks(),
                background: this.calculateBackground(),
                integration: this.calculateIntegration(),
                purity: this.calculatePurity(),
                rfValue: this.calculateRfValue()
            };

            // 显示分析结果
            this.displayAnalysisResults(analysisResults);

            // 保存分析结果
            await this.saveAnalysisResults(analysisResults);

            // 创建电子签名要求分析完成
            await this.requestAnalysisSignature();

            UI.hideLoading();
            Auth.log('数据分析完成', 'success');

        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'analysis_failed', {
                dataPointsCount: this.dataPoints.length,
                functionName: 'analyze'
            });
            
            UI.hideLoading();
            console.error('分析失败:', errorInfo.message);
            UI.showAlert('分析失败', errorInfo.userMessage, 'error');
        }
    },

    // 峰值检测
    detectPeaks() {
        const counts = this.dataPoints.map(p => p.y);
        const positions = this.dataPoints.map(p => p.x);
        
        const peaks = [];
        const minHeight = parseFloat(document.getElementById('background-threshold')?.value) || 10;
        const minDistance = 5;

        for (let i = 1; i < counts.length - 1; i++) {
            if (counts[i] > counts[i - 1] && 
                counts[i] > counts[i + 1] && 
                counts[i] >= minHeight) {
                
                // 检查最小距离
                const lastPeak = peaks[peaks.length - 1];
                if (!lastPeak || i - lastPeak.index >= minDistance) {
                    peaks.push({
                        index: i,
                        position: positions[i],
                        value: counts[i],
                        area: this.calculatePeakArea(i)
                    });
                }
            }
        }

        return peaks;
    },

    // 计算峰面积
    calculatePeakArea(peakIndex) {
        if (!this.dataPoints[peakIndex]) return 0;

        // 找到基线交点
        const leftBase = this.findBaselineIntersection(peakIndex, -1);
        const rightBase = this.findBaselineIntersection(peakIndex, 1);
        
        if (leftBase === -1 || rightBase === -1) return 0;

        // 计算梯形面积
        let area = 0;
        for (let i = leftBase; i < rightBase; i++) {
            const height = this.dataPoints[i].y - this.getBaselineValue(i);
            const width = this.dataPoints[i + 1].x - this.dataPoints[i].x;
            area += height * width;
        }

        return area;
    },

    // 查找基线交点
    findBaselineIntersection(peakIndex, direction) {
        const threshold = this.dataPoints[peakIndex].y * 0.1; // 10%阈值
        
        let i = peakIndex;
        while (i > 0 && i < this.dataPoints.length - 1) {
            i += direction;
            if (this.dataPoints[i].y <= threshold) {
                return i;
            }
        }
        
        return direction > 0 ? this.dataPoints.length - 1 : 0;
    },

    // 获取基线值
    getBaselineValue(index) {
        // 简单的平均基线
        const backgroundPoints = this.dataPoints.filter(p => p.y < 10);
        if (backgroundPoints.length > 0) {
            return backgroundPoints.reduce((sum, p) => sum + p.y, 0) / backgroundPoints.length;
        }
        return 0;
    },

    // 计算背景
    calculateBackground() {
        const backgroundPoints = this.dataPoints.filter(p => p.y < 10);
        const background = backgroundPoints.length > 0 ? 
            backgroundPoints.reduce((sum, p) => sum + p.y, 0) / backgroundPoints.length : 0;
        
        return {
            value: background,
            area: background * (this.dataPoints[this.dataPoints.length - 1].x - this.dataPoints[0].x)
        };
    },

    // 计算积分
    calculateIntegration() {
        const mainPeaks = this.detectPeaks();
        const totalArea = this.dataPoints.reduce((sum, point, index) => {
            if (index === 0) return 0;
            const width = this.dataPoints[index].x - this.dataPoints[index - 1].x;
            const height = (this.dataPoints[index].y + this.dataPoints[index - 1].y) / 2;
            return sum + height * width;
        }, 0);

        const backgroundArea = this.calculateBackground().area;
        const netArea = totalArea - backgroundArea;

        return {
            totalArea,
            backgroundArea,
            netArea,
            peakAreas: mainPeaks.map(peak => peak.area)
        };
    },

    // 计算放射化学纯度
    calculatePurity() {
        const integration = this.calculateIntegration();
        const totalArea = integration.totalArea;
        
        if (totalArea === 0) return 0;
        
        const purity = (integration.netArea / totalArea) * 100;
        return Math.max(0, Math.min(100, purity));
    },

    // 计算Rf值
    calculateRfValue() {
        const peaks = this.detectPeaks();
        if (peaks.length === 0) return 0;

        // 获取前沿位置（通常是最后一个数据点的位置）
        const frontPosition = this.dataPoints[this.dataPoints.length - 1].x;
        
        // 计算主要峰的Rf值
        const mainPeak = peaks.reduce((max, peak) => 
            peak.value > max.value ? peak : max, peaks[0]);
        
        const rfValue = mainPeak.position / frontPosition;
        return Math.max(0, Math.min(1, rfValue));
    },

    // 显示分析结果
    displayAnalysisResults(results) {
        // 更新结果显示区域
        this.updateResultsDisplay(results);
        
        // 更新图表标记
        this.updateChartMarkers(results);
        
        // 创建分析控制面板
        this.createAnalysisControls(results);
    },

    // 更新结果显示
    updateResultsDisplay(results) {
        const peakArea = document.getElementById('peak-area');
        const backgroundArea = document.getElementById('background-area');
        const netPeakArea = document.getElementById('net-peak-area');
        const purity = document.getElementById('purity');
        const rfValue = document.getElementById('rf-value');

        if (peakArea) {
            peakArea.textContent = Utils.formatNumber(results.integration.totalArea, 1);
        }

        if (backgroundArea) {
            backgroundArea.textContent = Utils.formatNumber(results.integration.backgroundArea, 1);
        }

        if (netPeakArea) {
            netPeakArea.textContent = Utils.formatNumber(results.integration.netArea, 1);
        }

        if (purity) {
            purity.textContent = Utils.formatPercentage(results.purity);
        }

        if (rfValue) {
            rfValue.textContent = Utils.formatNumber(results.rfValue, 3);
        }
    },

    // 更新图表标记
    updateChartMarkers(results) {
        // 更新峰标记
        const peakMarkers = document.querySelectorAll('.chart-marker.peak');
        peakMarkers.forEach((marker, index) => {
            if (results.peaks[index]) {
                const position = this.positionToPercentage(results.peaks[index].position);
                marker.style.left = `${position}%`;
                marker.dataset.position = results.peaks[index].position;
                
                const label = marker.querySelector('.marker-label');
                if (label) {
                    label.textContent = (index + 1).toString();
                }
            }
        });

        // 更新位置标记
        const spotMarker = document.getElementById('spot-marker');
        if (spotMarker) {
            spotMarker.style.left = '0%';
            spotMarker.dataset.position = '0';
        }

        const frontMarker = document.getElementById('front-marker');
        if (frontMarker) {
            const frontPosition = this.dataPoints[this.dataPoints.length - 1]?.x || 100;
            const percentage = this.positionToPercentage(frontPosition);
            frontMarker.style.left = `${percentage}%`;
            frontMarker.dataset.position = frontPosition;
        }
    },

    // 创建分析控制面板
    createAnalysisControls(results) {
        const analysisControls = document.querySelector('.analysis-controls');
        if (!analysisControls) return;

        // 更新分析控制内容
        analysisControls.innerHTML = `
            <h4>分析结果</h4>
            <div class="analysis-result">
                <div>检测到 ${results.peaks.length} 个峰</div>
                <div>放射化学纯度: ${Utils.formatPercentage(results.purity)}</div>
                <div>Rf值: ${Utils.formatNumber(results.rfValue, 3)}</div>
            </div>
            <button class="analysis-btn analyze" onclick="ChartModule.exportAnalysis()">导出分析结果</button>
            <button class="analysis-btn reset" onclick="ChartModule.resetAnalysis()">重新分析</button>
            <button class="analysis-btn export" onclick="ChartModule.generateReport()">生成报告</button>
        `;
    },

    // 导出分析结果
    exportAnalysis() {
        const analysisData = {
            timestamp: new Date().toISOString(),
            user: Auth.getCurrentUser(),
            dataPoints: this.dataPoints,
            results: {
                peaks: this.detectPeaks(),
                background: this.calculateBackground(),
                integration: this.calculateIntegration(),
                purity: this.calculatePurity(),
                rfValue: this.calculateRfValue()
            }
        };

        const filename = `analysis_${Utils.formatDate(new Date(), 'YYYYMMDD_HHmmss')}.json`;
        Utils.file.downloadJSON(analysisData, filename);
        
        Auth.log('分析结果已导出', 'success');
    },

    // 生成报告
    generateReport() {
        // 这里可以实现PDF报告生成逻辑
        UI.showAlert('报告生成', '报告生成功能正在开发中', 'info');
    },

    // 重置分析
    resetAnalysis() {
        this.dataPoints = [];
        this.peakMarkers = [];
        this.integrationRegions = [];
        
        if (this.chart) {
            this.chart.data.datasets[0].data = [];
            this.chart.data.datasets[1].data = [];
            this.chart.update();
        }
        
        // 清除结果显示
        ['peak-area', 'background-area', 'net-peak-area', 'purity', 'rf-value'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '0';
            }
        });
        
        Auth.log('分析已重置', 'info');
    },

    // 保存分析结果
    async saveAnalysisResults(results) {
        try {
            const analysisData = {
                analysisName: `分析_${Utils.formatDateTime(new Date())}`,
                analysisType: '放射色谱分析',
                sampleId: '未知样品',
                dataPoints: this.dataPoints.length,
                results: results
            };

            const result = await window.electronAPI.data.saveAnalysis(analysisData);
            
            if (result.success) {
                this.currentAnalysis = result.analysis;
                Auth.log(`分析结果已保存: ${result.analysis.id}`, 'success');
            }
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'analysis_save_failed', {
                analysisName: analysisData.analysisName,
                functionName: 'saveAnalysisResults'
            });
            
            console.error('保存分析结果失败:', errorInfo.message);
        }
    },

    // 请求分析签名
    async requestAnalysisSignature() {
        try {
            const signatureData = {
                entityType: 'Analysis',
                entityId: this.currentAnalysis?.id || 'current',
                action: 'ANALYSIS_COMPLETE',
                reason: '数据分析完成确认',
                comment: `检测到 ${this.detectPeaks().length} 个峰，纯度 ${Utils.formatPercentage(this.calculatePurity())}`
            };

            await Auth.createElectronicSignature(signatureData);
            Auth.log('分析完成签名已记录', 'success');
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error, 'analysis_signature_failed', {
                entityType: signatureData.entityType,
                entityId: signatureData.entityId,
                action: signatureData.action,
                functionName: 'requestAnalysisSignature'
            });
            
            console.error('创建分析签名失败:', errorInfo.message);
        }
    },

    // 实时更新结果
    updateRealTimeResults() {
        // 更新实时数据显示
        const currentPosition = document.getElementById('current-position');
        const currentCounts = document.getElementById('current-counts');
        const totalPoints = document.getElementById('total-points');
        const measurementTime = document.getElementById('measurement-time');

        if (currentPosition && this.dataPoints.length > 0) {
            const latestPoint = this.dataPoints[this.dataPoints.length - 1];
            currentPosition.textContent = Utils.formatPosition(latestPoint.x);
        }

        if (currentCounts && this.dataPoints.length > 0) {
            const latestPoint = this.dataPoints[this.dataPoints.length - 1];
            currentCounts.textContent = Utils.formatCountRate(latestPoint.y);
        }

        if (totalPoints) {
            totalPoints.textContent = this.dataPoints.length.toString();
        }

        // 更新测量时间
        if (measurementTime && window.AnalysisModule) {
            const elapsed = window.AnalysisModule.getElapsedTime();
            measurementTime.textContent = Utils.formatDuration(elapsed);
        }
    },

    // 图表缩放
    zoom(factor) {
        if (!this.chart) return;

        const scale = this.chart.options.scales.x;
        const currentRange = scale.max - scale.min;
        const center = (scale.min + scale.max) / 2;
        const newRange = currentRange / factor;

        scale.min = center - newRange / 2;
        scale.max = center + newRange / 2;

        this.chart.update();
    },

    // 重置缩放
    resetZoom() {
        if (!this.chart) return;

        this.chart.options.scales.x.min = undefined;
        this.chart.options.scales.x.max = undefined;
        this.chart.options.scales.y.min = undefined;
        this.chart.options.scales.y.max = undefined;

        this.chart.update();
    },

    // 百分比转位置
    percentageToPosition(percentage) {
        const xScale = this.chart?.scales?.x;
        if (!xScale) return 0;
        
        return xScale.getValueForPixel(this.canvas.width * percentage / 100);
    },

    // 位置转百分比
    positionToPercentage(position) {
        const xScale = this.chart?.scales?.x;
        if (!xScale) return 0;
        
        return (xScale.getPixelForValue(position) / this.canvas.width) * 100;
    },

    // 更新鼠标坐标显示
    updateMouseCoordinates(x, y) {
        // 可以在这里添加鼠标坐标显示逻辑
    },

    // 显示数据点信息
    showDataPointInfo(x, y) {
        // 查找最近的数据点
        if (this.dataPoints.length === 0) return;

        let closestPoint = null;
        let minDistance = Infinity;

        this.dataPoints.forEach(point => {
            const distance = Math.abs(point.x - x);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        });

        if (closestPoint && minDistance < 5) { // 5mm容差
            const message = `位置: ${Utils.formatPosition(closestPoint.x)}mm\n` +
                          `计数率: ${Utils.formatCountRate(closestPoint.y)}counts/s\n` +
                          `时间: ${Utils.formatTime(closestPoint.timestamp)}`;
            
            UI.showTooltip(this.canvas, x, y, message);
        }
    },

    // 触发标记移动事件
    triggerMarkerMove(marker, position) {
        const event = new CustomEvent('markerMove', {
            detail: { marker, position }
        });
        document.dispatchEvent(event);
    },

    // 保存标记位置
    saveMarkerPosition(marker) {
        const position = marker.dataset.position;
        const markerType = marker.classList.contains('peak') ? 'peak' : 'position';
        
        // 可以保存到本地存储或发送到服务器
        localStorage.setItem(`marker_${markerType}`, position);
        
        Auth.log(`标记位置已保存: ${markerType} = ${position}`, 'info');
    },

    // 加载标记位置
    loadMarkerPositions() {
        ['spot', 'front'].forEach(type => {
            const position = localStorage.getItem(`marker_${type}`);
            if (position) {
                const marker = document.getElementById(`${type}-marker`);
                if (marker) {
                    const percentage = this.positionToPercentage(parseFloat(position));
                    marker.style.left = `${percentage}%`;
                    marker.dataset.position = position;
                }
            }
        });
    },

    // 获取图表实例
    getChart() {
        return this.chart;
    },

    // 获取数据点
    getDataPoints() {
        return this.dataPoints;
    },

    // 清除所有数据
    clearData() {
        this.dataPoints = [];
        this.peakMarkers = [];
        this.integrationRegions = [];
        this.currentAnalysis = null;

        // 清理所有缓存
        this.clearAllCache();
        
        // 重置分页和虚拟滚动
        this.pagination = {
            currentPage: 1,
            totalPages: 1,
            pageSize: 1000,
            totalItems: 0,
            isLoading: false
        };
        
        this.virtualScroll = {
            isEnabled: false,
            visibleRange: { start: 0, end: 0 },
            bufferSize: 50,
            itemHeight: 1,
            containerHeight: 0,
            scrollTop: 0
        };

        if (this.chart) {
            this.chart.data.datasets[0].data = [];
            this.chart.data.datasets[1].data = [];
            this.chart.update('none');
        }
        
        console.log('所有数据已清除，包括缓存');
    },

    // 清除所有缓存
    clearAllCache() {
        this.dataCache.aggregated.clear();
        this.dataCache.processed.clear();
        this.dataCache.viewport.clear();
        this.dataCache.lastAccessed.clear();
        this.renderQueue = [];
    },

    // 销毁图表实例（释放内存）
    destroyChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        // 清理内存监控
        if (this.memoryMonitor) {
            clearInterval(this.memoryMonitor);
            this.memoryMonitor = null;
        }
        
        // 清理定时器
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        
        console.log('图表实例已销毁，内存已释放');
    },

    // 导出性能数据
    exportPerformanceData() {
        const performanceData = {
            timestamp: new Date().toISOString(),
            stats: this.getPerformanceStats(),
            system: {
                userAgent: navigator.userAgent,
                memory: this.memoryUsage,
                canvas: {
                    width: this.canvas?.width,
                    height: this.canvas?.height
                }
            },
            config: this.performanceConfig
        };

        const filename = `performance_${Utils.formatDate(new Date(), 'YYYYMMDD_HHmmss')}.json`;
        Utils.file.downloadJSON(performanceData, filename);
        
        Auth.log('性能数据已导出', 'success');
    },

    // 获取渲染队列状态
    getRenderQueueStatus() {
        return {
            isProcessing: this.isRendering,
            queueLength: this.renderQueue.length,
            lastRenderTime: this.lastRenderTime,
            averageRenderTime: this.calculateAverageRenderTime()
        };
    },

    // 计算平均渲染时间
    calculateAverageRenderTime() {
        // 这里可以维护一个渲染时间的历史记录来计算平均值
        return this.renderHistory?.reduce((sum, time) => sum + time, 0) / (this.renderHistory?.length || 1);
    },

    // 切换数据聚合
    toggleDataAggregation() {
        this.performanceConfig.enableDataAggregation = !this.performanceConfig.enableDataAggregation;
        
        if (!this.performanceConfig.enableDataAggregation) {
            // 禁用聚合时清理缓存
            this.dataCache.aggregated.clear();
        } else {
            // 启用聚合时重新处理数据
            this.rebuildAggregatedData();
        }
        
        this.updateChartDataOptimized();
        
        Auth.log(`数据聚合已${this.performanceConfig.enableDataAggregation ? '启用' : '禁用'}`, 'info');
    },

    // 设置数据聚合阈值
    setAggregationThreshold(threshold) {
        this.performanceConfig.aggregationThreshold = Math.max(100, threshold);
        
        // 根据新阈值重新处理数据
        if (this.dataPoints.length > this.performanceConfig.aggregationThreshold) {
            this.aggregateData();
            this.updateChartDataOptimized();
        }
        
        Auth.log(`数据聚合阈值设置为: ${this.performanceConfig.aggregationThreshold}`, 'info');
    },

    // 获取最佳聚合策略
    getOptimalAggregationStrategy() {
        const dataSize = this.dataPoints.length;
        const memoryLimit = this.memoryUsage.limit || 128 * 1024 * 1024; // 默认128MB
        const currentMemory = this.memoryUsage.used || 0;
        
        let strategy = {
            enabled: true,
            targetPoints: this.performanceConfig.maxVisiblePoints,
            method: 'lttb',
            quality: 'high'
        };
        
        if (dataSize > 10000) {
            strategy.targetPoints = Math.min(2000, dataSize / 5);
            strategy.method = 'min-max';
            strategy.quality = 'medium';
        }
        
        if (dataSize > 50000) {
            strategy.targetPoints = Math.min(1000, dataSize / 50);
            strategy.method = 'sampling';
            strategy.quality = 'low';
        }
        
        if (currentMemory / memoryLimit > 0.8) {
            strategy.targetPoints = Math.min(strategy.targetPoints, 500);
            strategy.quality = 'low';
        }
        
        return strategy;
    },

    // 性能监控报告
    generatePerformanceReport() {
        const stats = this.getPerformanceStats();
        const memoryThreshold = 80; // 80%内存使用阈值
        const renderThreshold = 100; // 100ms渲染时间阈值
        
        const report = {
            summary: '图表性能分析报告',
            timestamp: new Date().toISOString(),
            dataPoints: {
                total: stats.dataPoints,
                cached: stats.cachedAggregated + stats.cachedProcessed + stats.cachedViewport,
                aggregationEnabled: this.performanceConfig.enableDataAggregation,
                virtualScrollEnabled: stats.virtualScroll.isEnabled
            },
            memory: {
                usage: stats.memory.percentage?.toFixed(1) + '%',
                status: stats.memory.percentage > memoryThreshold ? '警告' : '正常'
            },
            rendering: {
                lastRenderTime: stats.lastRenderTime,
                status: stats.lastRenderTime > renderThreshold ? '需要优化' : '良好'
            },
            recommendations: this.generatePerformanceRecommendations(stats)
        };
        
        return report;
    },

    // 生成性能优化建议
    generatePerformanceRecommendations(stats) {
        const recommendations = [];
        
        if (stats.dataPoints > this.performanceConfig.aggregationThreshold && !this.performanceConfig.enableDataAggregation) {
            recommendations.push('建议启用数据聚合以提高渲染性能');
        }
        
        if (stats.memory.percentage > 80) {
            recommendations.push('内存使用率较高，建议清理缓存或增加聚合级别');
        }
        
        if (stats.virtualScroll.isEnabled && !stats.pagination.isLoading) {
            recommendations.push('虚拟滚动已启用，但页面加载较慢');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('当前性能表现良好');
        }
        
        return recommendations;
    },

    // 性能基准测试
    runPerformanceBenchmark() {
        console.log('开始性能基准测试...');
        
        const benchmarkResults = {
            timestamp: new Date().toISOString(),
            dataSize: this.dataPoints.length,
            tests: {}
        };
        
        // 测试1: 数据聚合性能
        const aggregationStart = performance.now();
        this.rebuildAggregatedData();
        benchmarkResults.tests.aggregationTime = performance.now() - aggregationStart;
        
        // 测试2: 图表更新性能
        const updateStart = performance.now();
        this.updateChartDataOptimized();
        benchmarkResults.tests.updateTime = performance.now() - updateStart;
        
        // 测试3: 缓存性能
        const cacheStart = performance.now();
        this.enforceCacheSize();
        benchmarkResults.tests.cacheTime = performance.now() - cacheStart;
        
        console.log('性能基准测试完成:', benchmarkResults);
        return benchmarkResults;
    }
};

// 监听图表事件
document.addEventListener('markerMove', (event) => {
    console.log('标记移动:', event.detail);
});

// 监听页面卸载事件，清理资源
window.addEventListener('beforeunload', () => {
    if (window.ChartModule) {
        window.ChartModule.destroyChart();
    }
});

// 监听页面可见性变化，优化性能
document.addEventListener('visibilitychange', () => {
    if (window.ChartModule && window.ChartModule.chart) {
        if (document.hidden) {
            // 页面隐藏时暂停图表动画
            window.ChartModule.chart.options.animation = false;
        } else {
            // 页面显示时恢复图表
            window.ChartModule.chart.update('none');
        }
    }
});

// 监听窗口大小变化，优化响应式性能
window.addEventListener('resize', window.ChartModule.debounce(() => {
    if (window.ChartModule && window.ChartModule.chart) {
        window.ChartModule.chart.resize();
    }
}, 250));

// 导出模块到全局作用域（用于调试和性能监控）
if (typeof window !== 'undefined') {
    window.ChartModulePerformance = {
        getStats: () => window.ChartModule.getPerformanceStats(),
        exportPerformance: () => window.ChartModule.exportPerformanceData(),
        runBenchmark: () => window.ChartModule.runPerformanceBenchmark(),
        toggleAggregation: () => window.ChartModule.toggleDataAggregation(),
        setThreshold: (threshold) => window.ChartModule.setAggregationThreshold(threshold),
        generateReport: () => window.ChartModule.generatePerformanceReport()
    };
    
    console.log('图表性能监控工具已加载，可通过 window.ChartModulePerformance 访问');
}

console.log('图表模块已加载 - 性能优化版本');
console.log('性能特性: 数据聚合, 虚拟滚动, 内存管理, 渲染优化');