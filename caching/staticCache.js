/**
 * 放射化学纯度检测仪 - 静态资源缓存系统
 * 支持内存缓存、磁盘缓存、Gzip压缩、版本控制等特性
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fssync = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const { EventEmitter } = require('events');

class StaticCache extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 默认配置
        this.config = {
            // 缓存目录
            cacheDir: options.cacheDir || path.join(__dirname, '../cache'),
            // 内存缓存配置
            memoryCache: {
                enabled: options.memoryCache?.enabled !== false,
                maxSize: options.memoryCache?.maxSize || 100 * 1024 * 1024, // 100MB
                maxEntries: options.memoryCache?.maxEntries || 1000,
                ttl: options.memoryCache?.ttl || 3600000 // 1小时
            },
            // 磁盘缓存配置
            diskCache: {
                enabled: options.diskCache?.enabled !== false,
                maxSize: options.diskCache?.maxSize || 500 * 1024 * 1024, // 500MB
                ttl: options.diskCache?.ttl || 24 * 3600000 // 24小时
            },
            // 压缩配置
            compression: {
                enabled: options.compression?.enabled !== false,
                level: options.compression?.level || 6,
                threshold: options.compression?.threshold || 1024
            },
            // 缓存策略
            strategies: {
                css: { ttl: 7 * 24 * 3600000, cacheControl: 'public, max-age=604800' },
                js: { ttl: 7 * 24 * 3600000, cacheControl: 'public, max-age=604800' },
                image: { ttl: 30 * 24 * 3600000, cacheControl: 'public, max-age=2592000' },
                html: { ttl: 3600000, cacheControl: 'public, max-age=3600' },
                font: { ttl: 90 * 24 * 3600000, cacheControl: 'public, max-age=7776000' }
            },
            // 文件监控
            watch: {
                enabled: options.watch?.enabled !== false,
                interval: options.watch?.interval || 5000 // 5秒
            },
            // 统计配置
            stats: {
                enabled: options.stats?.enabled !== false,
                interval: options.stats?.interval || 60000 // 1分钟
            }
        };

        // 内存缓存存储
        this.memoryCache = new Map();
        this.memoryStats = {
            size: 0,
            hits: 0,
            misses: 0,
            evictions: 0
        };

        // 磁盘缓存索引
        this.diskIndex = new Map();
        this.diskStats = {
            size: 0,
            hits: 0,
            misses: 0,
            writes: 0,
            reads: 0
        };

        // 文件监控
        this.fileWatchers = new Map();
        
        // 初始化
        this.initialize();
    }

    async initialize() {
        try {
            // 创建缓存目录
            await fs.mkdir(this.config.cacheDir, { recursive: true });
            await fs.mkdir(path.join(this.config.cacheDir, 'static'), { recursive: true });
            await fs.mkdir(path.join(this.config.cacheDir, 'index'), { recursive: true });

            // 加载磁盘缓存索引
            await this.loadDiskIndex();

            // 启动文件监控
            if (this.config.watch.enabled) {
                this.startFileWatching();
            }

            // 启动统计收集
            if (this.config.stats.enabled) {
                this.startStatsCollection();
            }

            // 启动定期清理
            this.startPeriodicCleanup();

            console.log('静态资源缓存系统初始化完成');
            this.emit('initialized');
        } catch (error) {
            console.error('静态资源缓存系统初始化失败:', error);
            this.emit('error', error);
        }
    }

    /**
     * 创建Express中间件
     */
    createMiddleware() {
        return async (req, res, next) => {
            try {
                const filePath = this.getFilePath(req.path);
                const cacheKey = this.generateCacheKey(req.path);
                
                // 检查缓存
                const cachedContent = await this.get(cacheKey);
                
                if (cachedContent) {
                    // 设置缓存头部
                    this.setCacheHeaders(res, cachedContent);
                    
                    // 发送缓存内容
                    if (cachedContent.compressed) {
                        res.set('Content-Encoding', 'gzip');
                        res.send(cachedContent.data);
                    } else {
                        res.send(cachedContent.data);
                    }
                    
                    this.memoryStats.hits++;
                    return;
                }

                // 缓存未命中，继续到下一个中间件
                this.memoryStats.misses++;
                next();

                // 在响应后缓存内容
                res.on('finish', () => {
                    if (res.statusCode === 200) {
                        this.cacheResponse(req.path, res, cacheKey);
                    }
                });

            } catch (error) {
                console.error('缓存中间件错误:', error);
                next();
            }
        };
    }

    /**
     * 获取文件路径
     */
    getFilePath(urlPath) {
        // 映射URL路径到实际文件路径
        const publicDir = path.join(__dirname, '../public');
        const rendererDir = path.join(__dirname, '../renderer');
        
        // 尝试多个可能的路径
        const possiblePaths = [
            path.join(publicDir, urlPath),
            path.join(rendererDir, urlPath),
            path.join(publicDir, 'assets', urlPath),
            path.join(rendererDir, 'assets', urlPath)
        ];

        return possiblePaths.find(p => fssync.existsSync(p));
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(filePath) {
        return crypto.createHash('md5').update(filePath).digest('hex');
    }

    /**
     * 设置缓存头部
     */
    setCacheHeaders(res, cachedContent) {
        res.set('Cache-Control', cachedContent.cacheControl);
        res.set('ETag', cachedContent.etag);
        res.set('Last-Modified', cachedContent.lastModified);
        res.set('X-Cache', 'HIT');
        
        if (cachedContent.compressed) {
            res.set('Content-Encoding', 'gzip');
        }
    }

    /**
     * 缓存响应
     */
    async cacheResponse(urlPath, res, cacheKey) {
        try {
            const buffer = res.locals.buffer || res.locals.data;
            if (!buffer) return;

            const content = {
                data: buffer,
                etag: this.generateETag(buffer),
                lastModified: new Date().toISOString(),
                cacheControl: this.getCacheControl(urlPath),
                compressed: this.shouldCompress(urlPath, buffer),
                size: buffer.length,
                urlPath,
                timestamp: Date.now()
            };

            // 压缩内容
            if (content.compressed) {
                content.data = await this.compress(buffer);
            }

            // 存储到缓存
            await this.set(cacheKey, content);

        } catch (error) {
            console.error('缓存响应失败:', error);
        }
    }

    /**
     * 生成ETag
     */
    generateETag(buffer) {
        return `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
    }

    /**
     * 获取缓存控制头部
     */
    getCacheControl(urlPath) {
        const ext = path.extname(urlPath).toLowerCase();
        
        if (ext === '.css' || ext === '.js') return this.config.strategies.css.cacheControl;
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
            return this.config.strategies.image.cacheControl;
        }
        if (ext === '.html') return this.config.strategies.html.cacheControl;
        if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
            return this.config.strategies.font.cacheControl;
        }
        
        return 'public, max-age=3600';
    }

    /**
     * 判断是否应该压缩
     */
    shouldCompress(urlPath, buffer) {
        if (!this.config.compression.enabled) return false;
        
        const ext = path.extname(urlPath).toLowerCase();
        // 不压缩图片和字体文件
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
            return false;
        }
        
        return buffer.length > this.config.compression.threshold;
    }

    /**
     * 压缩数据
     */
    compress(data) {
        return new Promise((resolve, reject) => {
            zlib.gzip(data, { 
                level: this.config.compression.level 
            }, (err, compressed) => {
                if (err) reject(err);
                else resolve(compressed);
            });
        });
    }

    /**
     * 解压缩数据
     */
    decompress(data) {
        return new Promise((resolve, reject) => {
            zlib.gunzip(data, (err, decompressed) => {
                if (err) reject(err);
                else resolve(decompressed);
            });
        });
    }

    /**
     * 获取缓存项
     */
    async get(cacheKey) {
        // 优先从内存缓存获取
        if (this.config.memoryCache.enabled) {
            const memoryItem = this.memoryCache.get(cacheKey);
            if (memoryItem && !this.isExpired(memoryItem)) {
                return memoryItem;
            }
        }

        // 从磁盘缓存获取
        if (this.config.diskCache.enabled) {
            try {
                const diskItem = await this.getFromDisk(cacheKey);
                if (diskItem && !this.isExpired(diskItem)) {
                    // 回放到内存缓存
                    if (this.config.memoryCache.enabled) {
                        this.setToMemory(cacheKey, diskItem);
                    }
                    return diskItem;
                }
            } catch (error) {
                console.error('从磁盘缓存获取失败:', error);
            }
        }

        return null;
    }

    /**
     * 设置缓存项
     */
    async set(cacheKey, content) {
        // 存储到内存缓存
        if (this.config.memoryCache.enabled) {
            await this.setToMemory(cacheKey, content);
        }

        // 存储到磁盘缓存
        if (this.config.diskCache.enabled) {
            await this.setToDisk(cacheKey, content);
        }
    }

    /**
     * 存储到内存缓存
     */
    setToMemory(cacheKey, content) {
        // 检查内存限制
        if (this.memoryCache.size >= this.config.memoryCache.maxEntries ||
            this.memoryStats.size + content.size > this.config.memoryCache.maxSize) {
            this.evictFromMemory();
        }

        this.memoryCache.set(cacheKey, content);
        this.memoryStats.size += content.size;
    }

    /**
     * 从内存缓存获取
     */
    getFromMemory(cacheKey) {
        const item = this.memoryCache.get(cacheKey);
        if (item && !this.isExpired(item)) {
            return item;
        }
        return null;
    }

    /**
     * 从内存缓存驱逐
     */
    evictFromMemory() {
        const items = Array.from(this.memoryCache.entries());
        // 按时间戳排序，删除最老的项目
        items.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = items.slice(0, Math.ceil(items.length * 0.1)); // 移除10%
        
        for (const [key, item] of toRemove) {
            this.memoryCache.delete(key);
            this.memoryStats.size -= item.size;
            this.memoryStats.evictions++;
        }
    }

    /**
     * 存储到磁盘缓存
     */
    async setToDisk(cacheKey, content) {
        try {
            const filePath = path.join(this.config.cacheDir, 'static', `${cacheKey}.cache`);
            const indexEntry = {
                key: cacheKey,
                path: filePath,
                size: content.size,
                timestamp: content.timestamp,
                etag: content.etag,
                lastModified: content.lastModified,
                cacheControl: content.cacheControl,
                compressed: content.compressed,
                urlPath: content.urlPath
            };

            // 写入缓存文件
            await fs.writeFile(filePath, JSON.stringify(content));
            
            // 更新索引
            this.diskIndex.set(cacheKey, indexEntry);
            this.diskStats.size += content.size;
            this.diskStats.writes++;

            // 检查磁盘限制
            await this.checkDiskLimit();

        } catch (error) {
            console.error('存储到磁盘缓存失败:', error);
        }
    }

    /**
     * 从磁盘缓存获取
     */
    async getFromDisk(cacheKey) {
        try {
            const indexEntry = this.diskIndex.get(cacheKey);
            if (!indexEntry) {
                this.diskStats.misses++;
                return null;
            }

            // 检查文件是否存在
            const exists = await fs.access(indexEntry.path).then(() => true).catch(() => false);
            if (!exists) {
                this.diskIndex.delete(cacheKey);
                this.diskStats.misses++;
                return null;
            }

            // 读取缓存文件
            const content = await fs.readFile(indexEntry.path, 'utf8');
            const parsed = JSON.parse(content);
            
            this.diskStats.hits++;
            this.diskStats.reads++;
            
            return parsed;

        } catch (error) {
            console.error('从磁盘缓存获取失败:', error);
            this.diskStats.misses++;
            return null;
        }
    }

    /**
     * 检查磁盘限制
     */
    async checkDiskLimit() {
        if (this.diskStats.size <= this.config.diskCache.maxSize) {
            return;
        }

        // 计算需要清理的大小
        const toClean = this.diskStats.size - this.config.diskCache.maxSize;
        let cleaned = 0;

        // 按时间戳排序，删除最老的文件
        const items = Array.from(this.diskIndex.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        for (const [key, indexEntry] of items) {
            if (cleaned >= toClean) break;

            try {
                await fs.unlink(indexEntry.path);
                this.diskIndex.delete(key);
                this.diskStats.size -= indexEntry.size;
                cleaned += indexEntry.size;
            } catch (error) {
                console.error('删除缓存文件失败:', error);
            }
        }
    }

    /**
     * 检查是否过期
     */
    isExpired(item) {
        return Date.now() - item.timestamp > this.config.memoryCache.ttl;
    }

    /**
     * 加载磁盘缓存索引
     */
    async loadDiskIndex() {
        try {
            const staticDir = path.join(this.config.cacheDir, 'static');
            const files = await fs.readdir(staticDir);

            for (const file of files) {
                if (file.endsWith('.cache')) {
                    try {
                        const content = await fs.readFile(path.join(staticDir, file), 'utf8');
                        const indexEntry = JSON.parse(content);
                        const cacheKey = file.replace('.cache', '');
                        this.diskIndex.set(cacheKey, indexEntry);
                        this.diskStats.size += indexEntry.size;
                    } catch (error) {
                        console.error('加载缓存索引失败:', error);
                    }
                }
            }

            console.log(`加载了 ${this.diskIndex.size} 个缓存索引`);
        } catch (error) {
            console.error('加载磁盘缓存索引失败:', error);
        }
    }

    /**
     * 启动文件监控
     */
    startFileWatching() {
        const publicDir = path.join(__dirname, '../public');
        const rendererDir = path.join(__dirname, '../renderer');

        [publicDir, rendererDir].forEach(dir => {
            if (fssync.existsSync(dir)) {
                this.watchDirectory(dir);
            }
        });
    }

    /**
     * 监控目录
     */
    watchDirectory(dirPath) {
        try {
            const watcher = fssync.watch(dirPath, { 
                persistent: true,
                recursive: true 
            });

            watcher.on('change', (eventType, filename) => {
                if (filename) {
                    const fullPath = path.join(dirPath, filename);
                    this.handleFileChange(fullPath, eventType);
                }
            });

            this.fileWatchers.set(dirPath, watcher);
            console.log(`开始监控目录: ${dirPath}`);
        } catch (error) {
            console.error('监控目录失败:', error);
        }
    }

    /**
     * 处理文件变更
     */
    handleFileChange(filePath, eventType) {
        const cacheKey = this.generateCacheKey(filePath);
        
        // 从内存缓存中删除
        this.memoryCache.delete(cacheKey);
        
        // 从磁盘缓存中删除
        const indexEntry = this.diskIndex.get(cacheKey);
        if (indexEntry) {
            fs.unlink(indexEntry.path).catch(console.error);
            this.diskIndex.delete(cacheKey);
            this.diskStats.size -= indexEntry.size;
        }

        console.log(`文件变更，已清理缓存: ${filePath} (${eventType})`);
        this.emit('fileChanged', { filePath, eventType, cacheKey });
    }

    /**
     * 启动统计收集
     */
    startStatsCollection() {
        setInterval(() => {
            this.emit('statsUpdate', this.getStats());
        }, this.config.stats.interval);
    }

    /**
     * 启动定期清理
     */
    startPeriodicCleanup() {
        setInterval(async () => {
            await this.cleanup();
        }, 3600000); // 每小时清理一次
    }

    /**
     * 清理过期缓存
     */
    async cleanup() {
        const now = Date.now();
        
        // 清理内存缓存
        for (const [key, item] of this.memoryCache.entries()) {
            if (this.isExpired(item)) {
                this.memoryCache.delete(key);
                this.memoryStats.size -= item.size;
            }
        }

        // 清理磁盘缓存
        for (const [key, indexEntry] of this.diskIndex.entries()) {
            if (now - indexEntry.timestamp > this.config.diskCache.ttl) {
                try {
                    await fs.unlink(indexEntry.path);
                    this.diskIndex.delete(key);
                    this.diskStats.size -= indexEntry.size;
                } catch (error) {
                    console.error('清理磁盘缓存失败:', error);
                }
            }
        }

        console.log('缓存清理完成');
        this.emit('cleanup');
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const hitRate = this.memoryStats.hits + this.diskStats.hits > 0 ?
            ((this.memoryStats.hits + this.diskStats.hits) / 
             (this.memoryStats.hits + this.memoryStats.misses + this.diskStats.hits + this.diskStats.misses) * 100).toFixed(2) : 0;

        return {
            memory: {
                ...this.memoryStats,
                entries: this.memoryCache.size,
                hitRate: this.memoryStats.hits > 0 ? 
                    (this.memoryStats.hits / (this.memoryStats.hits + this.memoryStats.misses) * 100).toFixed(2) : 0
            },
            disk: {
                ...this.diskStats,
                entries: this.diskIndex.size,
                hitRate: this.diskStats.hits > 0 ? 
                    (this.diskStats.hits / (this.diskStats.hits + this.diskStats.misses) * 100).toFixed(2) : 0
            },
            overall: {
                hitRate: `${hitRate}%`,
                totalSize: this.memoryStats.size + this.diskStats.size,
                cacheTypes: Object.keys(this.config.strategies).length
            }
        };
    }

    /**
     * 预热缓存
     */
    async warmCache(urlPaths = []) {
        const defaultPaths = [
            '/',
            '/assets/',
            '/js/',
            '/styles/',
            '/images/',
            '/fonts/'
        ];

        const pathsToWarm = urlPaths.length > 0 ? urlPaths : defaultPaths;

        console.log(`开始预热缓存，共 ${pathsToWarm.length} 个路径`);

        for (const urlPath of pathsToWarm) {
            try {
                const filePath = this.getFilePath(urlPath);
                if (filePath && fssync.existsSync(filePath)) {
                    const content = await fs.readFile(filePath);
                    const cacheKey = this.generateCacheKey(urlPath);
                    
                    const cachedContent = {
                        data: content,
                        etag: this.generateETag(content),
                        lastModified: new Date().toISOString(),
                        cacheControl: this.getCacheControl(urlPath),
                        compressed: this.shouldCompress(urlPath, content),
                        size: content.length,
                        urlPath,
                        timestamp: Date.now()
                    };

                    await this.set(cacheKey, cachedContent);
                    console.log(`预热缓存: ${urlPath}`);
                }
            } catch (error) {
                console.error(`预热缓存失败: ${urlPath}`, error);
            }
        }

        console.log('缓存预热完成');
        this.emit('cacheWarmed', { paths: pathsToWarm });
    }

    /**
     * 清空缓存
     */
    async clearCache() {
        // 清空内存缓存
        this.memoryCache.clear();
        this.memoryStats = {
            size: 0,
            hits: 0,
            misses: 0,
            evictions: 0
        };

        // 清空磁盘缓存
        try {
            const staticDir = path.join(this.config.cacheDir, 'static');
            await fs.rm(staticDir, { recursive: true, force: true });
            await fs.mkdir(staticDir, { recursive: true });
        } catch (error) {
            console.error('清空磁盘缓存失败:', error);
        }

        this.diskIndex.clear();
        this.diskStats = {
            size: 0,
            hits: 0,
            misses: 0,
            writes: 0,
            reads: 0
        };

        console.log('缓存已清空');
        this.emit('cacheCleared');
    }

    /**
     * 获取缓存文件列表
     */
    getCacheFiles() {
        const files = [];

        // 内存缓存文件
        for (const [key, item] of this.memoryCache.entries()) {
            files.push({
                type: 'memory',
                key,
                urlPath: item.urlPath,
                size: item.size,
                lastModified: item.lastModified,
                compressed: item.compressed,
                timestamp: item.timestamp
            });
        }

        // 磁盘缓存文件
        for (const [key, indexEntry] of this.diskIndex.entries()) {
            files.push({
                type: 'disk',
                key,
                urlPath: indexEntry.urlPath,
                size: indexEntry.size,
                lastModified: indexEntry.lastModified,
                compressed: indexEntry.compressed,
                timestamp: indexEntry.timestamp
            });
        }

        return files.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * 销毁缓存系统
     */
    async destroy() {
        // 停止文件监控
        for (const [dirPath, watcher] of this.fileWatchers.entries()) {
            watcher.close();
        }
        this.fileWatchers.clear();

        // 清空缓存
        await this.clearCache();

        console.log('静态资源缓存系统已销毁');
    }
}

/**
 * 创建缓存API路由
 */
function createCacheRoutes(cacheSystem) {
    const router = express.Router();

    // 获取缓存统计
    router.get('/stats', (req, res) => {
        try {
            const stats = cacheSystem.getStats();
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 清空缓存
    router.post('/clear', async (req, res) => {
        try {
            await cacheSystem.clearCache();
            res.json({
                success: true,
                message: '缓存已清空',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 预热缓存
    router.post('/warm', async (req, res) => {
        try {
            const { paths } = req.body;
            await cacheSystem.warmCache(paths);
            res.json({
                success: true,
                message: '缓存预热完成',
                paths: paths || [],
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // 获取缓存文件列表
    router.get('/files', (req, res) => {
        try {
            const files = cacheSystem.getCacheFiles();
            res.json({
                success: true,
                data: files,
                total: files.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}

module.exports = {
    StaticCache,
    createCacheRoutes
};