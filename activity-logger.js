/**
 * 活动日志记录器
 * 用于记录系统活动和管理日志
 */
class ActivityLogger {
    constructor() {
        this.logs = [];
        this.isInitialized = false;
        this.maxLogs = 1000; // 最大日志数量
        this.init();
    }

    /**
     * 初始化日志系统
     */
    init() {
        try {
            // 从localStorage加载历史日志
            const savedLogs = localStorage.getItem('activityLogs');
            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
            }
            this.isInitialized = true;
            this.log('系统', '日志系统初始化成功', 'info');
        } catch (error) {
            console.error('日志系统初始化失败:', error);
            this.isInitialized = false;
        }
    }

    /**
     * 记录日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别 (info, warning, error, success)
     * @param {object} data - 附加数据
     */
    log(module, message, level = 'info', data = null) {
        if (!this.isInitialized) {
            console.warn('日志系统未初始化');
            return;
        }

        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            module,
            message,
            level,
            data
        };

        this.logs.push(logEntry);

        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // 保存到localStorage
        this.saveToStorage();

        // 控制台输出
        const consoleMethod = level === 'error' ? 'error' : 
                             level === 'warning' ? 'warn' : 
                             level === 'success' ? 'log' : 'info';
        
        console[consoleMethod](`[${module}] ${message}`, data || '');
    }

    /**
     * 记录信息日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {object} data - 附加数据
     */
    info(module, message, data = null) {
        this.log(module, message, 'info', data);
    }

    /**
     * 记录警告日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {object} data - 附加数据
     */
    warning(module, message, data = null) {
        this.log(module, message, 'warning', data);
    }

    /**
     * 记录错误日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {object} data - 附加数据
     */
    error(module, message, data = null) {
        this.log(module, message, 'error', data);
    }

    /**
     * 记录成功日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {object} data - 附加数据
     */
    success(module, message, data = null) {
        this.log(module, message, 'success', data);
    }

    /**
     * 保存日志到localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('activityLogs', JSON.stringify(this.logs));
        } catch (error) {
            console.error('保存日志失败:', error);
        }
    }

    /**
     * 获取日志
     * @param {object} filters - 过滤条件
     * @returns {array} 过滤后的日志
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        // 按模块过滤
        if (filters.module) {
            filteredLogs = filteredLogs.filter(log => log.module === filters.module);
        }

        // 按级别过滤
        if (filters.level) {
            filteredLogs = filteredLogs.filter(log => log.level === filters.level);
        }

        // 按时间范围过滤
        if (filters.startTime) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(filters.startTime));
        }

        if (filters.endTime) {
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(filters.endTime));
        }

        // 按数量限制
        if (filters.limit) {
            filteredLogs = filteredLogs.slice(-filters.limit);
        }

        return filteredLogs;
    }

    /**
     * 清空日志
     */
    clearLogs() {
        this.logs = [];
        localStorage.removeItem('activityLogs');
        this.log('系统', '日志已清空', 'info');
    }

    /**
     * 导出日志
     * @param {string} format - 导出格式 (json, csv)
     * @returns {string} 导出的日志数据
     */
    exportLogs(format = 'json') {
        if (format === 'csv') {
            const headers = ['时间', '模块', '消息', '级别', '数据'];
            const rows = this.logs.map(log => [
                log.timestamp,
                log.module,
                log.message,
                log.level,
                log.data ? JSON.stringify(log.data) : ''
            ]);
            
            return [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
        } else {
            return JSON.stringify(this.logs, null, 2);
        }
    }

    /**
     * 获取日志统计信息
     * @returns {object} 统计信息
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {},
            byModule: {},
            recentActivity: this.logs.slice(-10) // 最近10条
        };

        // 按级别统计
        this.logs.forEach(log => {
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        });

        // 按模块统计
        this.logs.forEach(log => {
            stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
        });

        return stats;
    }

    /**
     * 检查系统状态
     * @returns {boolean} 系统是否正常
     */
    isHealthy() {
        return this.isInitialized && this.logs.length < this.maxLogs;
    }
}

// 创建全局实例
window.activityLogger = new ActivityLogger(); 