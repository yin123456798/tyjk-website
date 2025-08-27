// 天涯极客社团 - Node.js 服务器
const express = require('express');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

// 导入本地数据库API
const localDB = require('./local-database-api');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads', req.body.folder || 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.originalname);
        cb(null, `${timestamp}_${random}${extension}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        // 只允许图片文件
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'), false);
        }
    }
});

// JWT认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '访问令牌无效' });
        }
        req.user = user;
        next();
    });
};

// 初始化数据库
async function initDatabase() {
    try {
        const result = await localDB.init('sqlite', {
            dbPath: path.join(__dirname, 'tyjk_club.db')
        });
        
        if (result.success) {
            console.log('数据库初始化成功');
        } else {
            console.error('数据库初始化失败:', result.error);
        }
    } catch (error) {
        console.error('数据库初始化异常:', error);
    }
}

// API路由

// 1. 用户认证
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码不能为空' });
        }
        
        const result = await localDB.signUp(email, password, { name });
        
        if (result.success) {
            // 生成JWT令牌
            const token = jwt.sign({ userId: result.user.id, email }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, user: result.user, token });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码不能为空' });
        }
        
        const result = await localDB.signIn(email, password);
        
        if (result.success) {
            // 生成JWT令牌
            const token = jwt.sign({ userId: result.user.id, email }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, user: result.user, token });
        } else {
            res.status(401).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 2. 报名管理
app.post('/api/applications', authenticateToken, async (req, res) => {
    try {
        const applicationData = {
            ...req.body,
            user_id: req.user.userId
        };
        
        const result = await localDB.submitApplication(applicationData);
        
        if (result.success) {
            res.json({ success: true, message: '报名提交成功' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

app.get('/api/applications', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        const result = await localDB.getApplications(status);
        
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

app.put('/api/applications/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await localDB.updateApplicationStatus(id, status);
        
        if (result.success) {
            res.json({ success: true, message: '状态更新成功' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 3. 项目管理
app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const projectData = {
            ...req.body,
            owner_id: req.user.userId
        };
        
        const result = await localDB.createProject(projectData);
        
        if (result.success) {
            res.json({ success: true, message: '项目创建成功' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const { userId } = req.query;
        const result = await localDB.getProjects(userId);
        
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 4. 文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }
        
        const fileUrl = `/uploads/${req.body.folder || 'uploads'}/${req.file.filename}`;
        
        res.json({
            success: true,
            url: fileUrl,
            path: fileUrl,
            fileName: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ error: '文件上传失败' });
    }
});

// 5. 统计信息
app.get('/api/statistics', authenticateToken, async (req, res) => {
    try {
        const result = await localDB.getStatistics();
        
        if (result.success) {
            res.json({ success: true, data: result.data });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 6. 用户信息
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const result = await localDB.getUser(req.user.userId);
        
        if (result.success) {
            res.json({ success: true, user: result.user });
        } else {
            res.status(404).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
async function startServer() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log(`API文档: http://localhost:${PORT}/api`);
    });
}

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('正在关闭服务器...');
    await localDB.close();
    process.exit(0);
});

startServer(); 