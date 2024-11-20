const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const WEBHOOKS_FILE = path.join(__dirname, 'webhooks.json');
const LINKS_FILE = path.join(__dirname, 'links.json');
const WEBHOOK_STORAGE_FILE = path.join(__dirname, 'webhook-storage.json');

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 确保webhooks.json文件存在
async function ensureWebhooksFile() {
    try {
        await fs.access(WEBHOOKS_FILE);
    } catch {
        await fs.writeFile(WEBHOOKS_FILE, '[]');
    }
}

// 确保links.json文件存在
async function ensureLinksFile() {
    try {
        await fs.access(LINKS_FILE);
    } catch {
        await fs.writeFile(LINKS_FILE, '[]');
    }
}

// 确保webhook存储文件存在
async function ensureWebhookStorageFile() {
    try {
        await fs.access(WEBHOOK_STORAGE_FILE);
    } catch {
        await fs.writeFile(WEBHOOK_STORAGE_FILE, '[]');
    }
}

// 获取所有webhook
app.get('/api/webhooks', async (req, res) => {
    try {
        await ensureWebhooksFile();
        const data = await fs.readFile(WEBHOOKS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: '读取webhook失败' });
    }
});

// 获取所有链接
app.get('/api/links', async (req, res) => {
    try {
        await ensureLinksFile();
        const data = await fs.readFile(LINKS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: '读取链接失败' });
    }
});

// 获取存储的webhook列表
app.get('/api/webhook-storage', async (req, res) => {
    try {
        await ensureWebhookStorageFile();
        const data = await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: '读取webhook存储列表失败' });
    }
});

// 添加新webhook
app.post('/api/webhooks', async (req, res) => {
    try {
        await ensureWebhooksFile();
        const { name, url } = req.body;
        const data = JSON.parse(await fs.readFile(WEBHOOKS_FILE, 'utf8'));
        data.push({ name, url });
        await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '添加webhook失败' });
    }
});

// 添加新链接
app.post('/api/links', async (req, res) => {
    try {
        await ensureLinksFile();
        const { name, url } = req.body;
        const data = JSON.parse(await fs.readFile(LINKS_FILE, 'utf8'));
        data.push({ name, url });
        await fs.writeFile(LINKS_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '添加链接失败' });
    }
});

// 添加webhook到存储
app.post('/api/webhook-storage', async (req, res) => {
    try {
        await ensureWebhookStorageFile();
        const { name, url } = req.body;
        const data = JSON.parse(await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8'));
        data.push({ name, url });
        await fs.writeFile(WEBHOOK_STORAGE_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '添加到存储列表失败' });
    }
});

// 删除webhook
app.delete('/api/webhooks/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const data = JSON.parse(await fs.readFile(WEBHOOKS_FILE, 'utf8'));
        data.splice(index, 1);
        await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除webhook失败' });
    }
});

// 删除链接
app.delete('/api/links/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const data = JSON.parse(await fs.readFile(LINKS_FILE, 'utf8'));
        data.splice(index, 1);
        await fs.writeFile(LINKS_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除链接失败' });
    }
});

// 从存储中删除webhook
app.delete('/api/webhook-storage/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const data = JSON.parse(await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8'));
        data.splice(index, 1);
        await fs.writeFile(WEBHOOK_STORAGE_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '从存储列表删除失败' });
    }
});

// 更新webhook顺序
app.put('/api/webhooks', async (req, res) => {
    try {
        const webhooks = req.body;
        await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '更新webhook顺序失败' });
    }
});

// 添加新的路由

// 添加新分组
app.post('/api/webhook-storage/groups', async (req, res) => {
    try {
        const newGroup = req.body;
        const data = JSON.parse(await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8'));
        data.groups.push(newGroup);
        await fs.writeFile(WEBHOOK_STORAGE_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '添加分组失败' });
    }
});

// 删除分组
app.delete('/api/webhook-storage/groups/:groupId', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const data = JSON.parse(await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8'));
        data.groups = data.groups.filter(group => group.id !== groupId);
        await fs.writeFile(WEBHOOK_STORAGE_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除分组失败' });
    }
});

// 切换分组展开状态
app.put('/api/webhook-storage/groups/:groupId/toggle', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const data = JSON.parse(await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8'));
        const group = data.groups.find(g => g.id === groupId);
        if (group) {
            group.expanded = !group.expanded;
            await fs.writeFile(WEBHOOK_STORAGE_FILE, JSON.stringify(data, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '更新分组状态失败' });
    }
});

// 修改添加webhook到分组的路由
app.post('/api/webhook-storage/webhooks', async (req, res) => {
    try {
        const { groupId, webhook } = req.body;
        const data = JSON.parse(await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8'));
        
        // 查找目标分组
        const group = data.groups.find(g => g.id === groupId);
        if (!group) {
            throw new Error('分组不存在');
        }

        // 确保 group.webhooks 是数组
        if (!Array.isArray(group.webhooks)) {
            group.webhooks = [];
        }

        // 添加 webhook 到分组
        group.webhooks.push(webhook);

        // 保存更新后的数据
        await fs.writeFile(WEBHOOK_STORAGE_FILE, JSON.stringify(data, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('添加webhook失败:', error);
        res.status(500).json({ error: '添加webhook失败: ' + error.message });
    }
});

// 从分组中删除webhook
app.delete('/api/webhook-storage/groups/:groupId/webhooks/:index', async (req, res) => {
    try {
        const { groupId, index } = req.params;
        const data = JSON.parse(await fs.readFile(WEBHOOK_STORAGE_FILE, 'utf8'));
        const group = data.groups.find(g => g.id === groupId);
        if (group) {
            group.webhooks.splice(parseInt(index), 1);
            await fs.writeFile(WEBHOOK_STORAGE_FILE, JSON.stringify(data, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除webhook失败' });
    }
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 