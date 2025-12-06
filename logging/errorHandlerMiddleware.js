const ErrorLogger = require('./errorLogger');

/**
 * 错误处理中间件
 * 自动捕获和处理应用程序中的各种错误
 */
class ErrorHandlerMiddleware {
    constructor(options = {}) {
        this.errorLogger = options.errorLogger || ErrorLogger.getInstance();
        this.logErrors = options.logErrors !== false;
        this.respondWithError = options.respondWithError !== false;
    }

    /**
     * Express错误处理中间件
     */
    async errorHandler(error, req, res, next) {
        try {
            // 记录错误
            if (this.logErrors) {
                await this.logRequestError(error, req);
            }

            // 确定错误状态码
            const statusCode = this.getErrorStatusCode(error);
            
            // 确定错误级别
            const errorLevel = this.getErrorLevel(statusCode);

            // 构建错误响应
            const errorResponse = this.buildErrorResponse(error, req, statusCode);

            // 发送错误响应
            if (this.respondWithError) {
                res.status(statusCode).json(errorResponse);
            } else {
                // 如果不发送响应，则传递给下一个错误处理器
                errorResponse.originalError = error;
                error.statusCode = statusCode;
                error.response = errorResponse;
                next(error);
            }

        } catch (handlerError) {
            // 错误处理器本身的错误
            console.error('错误处理中间件执行失败:', handlerError);
            
            // 发送基本的500错误响应
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: {
                        code: 'INTERNAL_ERROR',
                        message: '服务器内部错误'
                    }
                });
            }
        }
    }

    /**
     * 记录请求错误
     */
    async logRequestError(error, req) {
        try {
            const errorContext = this.extractErrorContext(req);
            
            await this.errorLogger.logError({
                level: this.getErrorLevel(this.getErrorStatusCode(error)),
                message: error.message || 'Unknown error',
                stack: error.stack,
                source: 'api',
                code: error.code || this.getErrorCode(error),
                context: {
                    ...errorContext,
                    errorType: error.constructor.name,
                    statusCode: this.getErrorStatusCode(error)
                },
                metadata: {
                    originalUrl: req.originalUrl,
                    httpVersion: req.httpVersion,
                    contentType: req.get('Content-Type'),
                    contentLength: req.get('Content-Length'),
                    responseTime: this.calculateResponseTime(req)
                }
            });
        } catch (logError) {
            console.error('记录请求错误失败:', logError);
        }
    }

    /**
     * 提取错误上下文信息
     */
    extractErrorContext(req) {
        return {
            url: req.originalUrl || req.url,
            method: req.method,
            userId: req.user?.id,
            sessionId: req.sessionID,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            headers: this.sanitizeHeaders(req.headers),
            params: req.params,
            query: req.query,
            body: this.sanitizeRequestBody(req.body)
        };
    }

    /**
     * 获取客户端IP地址
     */
    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null);
    }

    /**
     * 清理请求头（移除敏感信息）
     */
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    /**
     * 清理请求体（移除敏感信息）
     */
    sanitizeRequestBody(body) {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const sanitized = { ...body };
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    /**
     * 获取错误状态码
     */
    getErrorStatusCode(error) {
        return error.statusCode || 
               error.status || 
               error.statusCode || 
               (error.name === 'ValidationError' ? 400 : 500);
    }

    /**
     * 获取错误代码
     */
    getErrorCode(error) {
        if (error.code) return error.code;
        
        const statusCode = this.getErrorStatusCode(error);
        
        switch (statusCode) {
            case 400: return 'BAD_REQUEST';
            case 401: return 'UNAUTHORIZED';
            case 403: return 'FORBIDDEN';
            case 404: return 'NOT_FOUND';
            case 409: return 'CONFLICT';
            case 422: return 'VALIDATION_ERROR';
            case 429: return 'TOO_MANY_REQUESTS';
            case 500: return 'INTERNAL_ERROR';
            case 502: return 'BAD_GATEWAY';
            case 503: return 'SERVICE_UNAVAILABLE';
            default: return 'UNKNOWN_ERROR';
        }
    }

    /**
     * 获取错误级别
     */
    getErrorLevel(statusCode) {
        if (statusCode >= 500) return 'critical';
        if (statusCode >= 400) return 'error';
        if (statusCode >= 300) return 'warning';
        return 'info';
    }

    /**
     * 构建错误响应
     */
    buildErrorResponse(error, req, statusCode) {
        const response = {
            success: false,
            error: {
                code: this.getErrorCode(error),
                message: this.getErrorMessage(error, statusCode),
                timestamp: new Date().toISOString(),
                path: req.originalUrl,
                method: req.method
            }
        };

        // 在开发环境中包含详细信息
        if (process.env.NODE_ENV === 'development') {
            response.error.stack = error.stack;
            response.error.details = error.details || error.message // ;
        }

       包含请求ID用于跟踪
        if (req.id) {
            response.error.requestId = req.id;
        }

        // 包含响应时间
        response.error.responseTime = this.calculateResponseTime(req);

        return response;
    }

    /**
     * 获取错误消息
     */
    getErrorMessage(error, statusCode) {
        if (error.message) {
            return error.message;
        }

        // 根据状态码返回默认消息
        switch (statusCode) {
            case 400: return '请求参数错误';
            case 401: return '未授权访问';
            case 403: return '访问被拒绝';
            case 404: return '请求的资源不存在';
            case 409: return '请求冲突';
            case 422: return '数据验证失败';
            case 429: return '请求过于频繁';
            case 500: return '服务器内部错误';
            case 502: return '网关错误';
            case 503: return '服务暂不可用';
            default: return '未知错误';
        }
    }

    /**
     * 计算响应时间
     */
    calculateResponseTime(req) {
        if (!req.startTime) return null;
        return Date.now() - req.startTime;
    }

    /**
     * 异步错误捕获包装器
     */
    asyncErrorHandler(handler) {
        return async (req, res, next) => {
            try {
                await handler(req, res, next);
            } catch (error) {
                await this.errorHandler(error, req, res, next);
            }
        };
    }

    /**
     * 同步错误捕获包装器
     */
    syncErrorHandler(handler) {
        return (req, res, next) => {
            try {
                handler(req, res, next);
            } catch (error) {
                this.errorHandler(error, req, res, next);
            }
        };
    }

    /**
     * 全局未捕获异常处理器
     */
    setupGlobalHandlers() {
        // 未捕获的异常
        process.on('uncaughtException', async (error) => {
            console.error('未捕获的异常:', error);
            
            await this.errorLogger.logError({
                level: 'critical',
                message: `未捕获的异常: ${error.message}`,
                stack: error.stack,
                source: 'process',
                code: 'UNCAUGHT_EXCEPTION',
                context: {
                    processId: process.pid,
                    nodeVersion: process.version,
                    memoryUsage: process.memoryUsage(),
                    uptime: process.uptime()
                }
            });

            // 优雅关闭
            process.exit(1);
        });

        // 未处理的Promise拒绝
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('未处理的Promise拒绝:', reason);
            
            await this.errorLogger.logError({
                level: 'error',
                message: `未处理的Promise拒绝: ${reason}`,
                stack: reason instanceof Error ? reason.stack : new Error(reason).stack,
                source: 'promise',
                code: 'UNHANDLED_REJECTION',
                context: {
                    promise: promise.toString(),
                    processId: process.pid
                }
            });
        });

        // 进程警告
        process.on('warning', async (warning) => {
            await this.errorLogger.logError({
                level: 'warning',
                message: `进程警告: ${warning.name} - ${warning.message}`,
                stack: warning.stack,
                source: 'process_warning',
                code: warning.code || 'PROCESS_WARNING',
                context: {
                    warningName: warning.name,
                    processId: process.pid
                }
            });
        });
    }

    /**
     * 数据库错误处理
     */
    databaseErrorHandler(operation) {
        return async (error, req, ...args) => {
            const errorContext = req ? this.extractErrorContext(req) : {};
            
            await this.errorLogger.logError({
                level: 'error',
                message: `数据库操作失败: ${error.message}`,
                stack: error.stack,
                source: 'database',
                code: error.code || 'DATABASE_ERROR',
                context: {
                    ...errorContext,
                    operation: operation,
                    database: error.database || 'unknown',
                    table: error.table || 'unknown'
                },
                metadata: {
                    sql: error.sql,
                    parameters: error.parameters
                }
            });

            throw error;
        };
    }

    /**
     * API调用错误处理
     */
    apiErrorHandler(serviceName) {
        return async (error, req, ...args) => {
            const errorContext = req ? this.extractErrorContext(req) : {};
            
            await this.errorLogger.logError({
                level: 'error',
                message: `API调用失败 (${serviceName}): ${error.message}`,
                stack: error.stack,
                source: 'api_call',
                code: error.code || 'API_CALL_ERROR',
                context: {
                    ...errorContext,
                    service: serviceName,
                    url: error.config?.url,
                    method: error.config?.method,
                    statusCode: error.response?.status
                },
                metadata: {
                    responseData: error.response?.data,
                    requestHeaders: error.config?.headers
                }
            });

            throw error;
        };
    }
}

module.exports = ErrorHandlerMiddleware;