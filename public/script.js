let triggerTimer = null;
let isTriggering = false;

// 将所有的 Sortable 初始化移到一个函数中
function initializeSortables() {
    // 初始化存储列表的拖拽
    new Sortable(webhookStorage, {
        animation: 150,
        group: {
            name: 'webhook-lists',
            pull: 'clone',
            put: false
        },
        sort: false
    });

    // 初始化webhook列表的拖拽
    const webhookListSortable = new Sortable(webhookList, {
        animation: 150,
        handle: '.webhook-drag-handle',
        ghostClass: 'sortable-ghost',
        group: 'webhook-lists',
        onAdd: function(evt) {
            const item = evt.item;
            const name = item.dataset.name;
            const url = item.dataset.url;
            
            // 创建新的 webhook 元素
            const newItem = createWebhookElement({ name, url, delay: 0 });
            
            // 将新元素插入到正确的位置
            if (evt.newIndex === webhookList.children.length - 1) {
                webhookList.appendChild(newItem);
            } else {
                webhookList.insertBefore(newItem, webhookList.children[evt.newIndex]);
            }
            
            // 移除原始拖入的元素
            item.remove();
            
            // 保存更新后的列表
            const webhooks = Array.from(document.querySelectorAll('#webhookList li')).map(li => ({
                name: li.querySelector('.fw-bold').textContent,
                url: li.querySelector('.text-muted').textContent,
                delay: parseInt(li.querySelector('.delay-input').value) || 0
            }));
            saveWebhooks(webhooks);
        },
        onEnd: async function() {
            const webhooks = Array.from(document.querySelectorAll('#webhookList li')).map(li => ({
                name: li.querySelector('.fw-bold').textContent,
                url: li.querySelector('.text-muted').textContent,
                delay: parseInt(li.querySelector('.delay-input').value) || 0
            }));
            await saveWebhooks(webhooks);
        }
    });

    // 将 Sortable 实例保存到元素上
    webhookList.sortable = webhookListSortable;
}

// 添加一个创建 webhook 元素的辅助函数
function createWebhookElement(webhook) {
    const li = document.createElement('li');
    li.className = 'list-group-item webhook-item status-pending';
    li.innerHTML = `
        <div class="webhook-drag-handle">☰</div>
        <input type="checkbox" class="form-check-input me-3">
        <div class="webhook-content">
            <div class="fw-bold">${webhook.name}</div>
            <div class="text-muted" title="${webhook.url}">${webhook.url}</div>
            <div class="webhook-status">未触发</div>
        </div>
        <div class="webhook-delay">
            <input type="number" class="form-control form-control-sm delay-input" 
                   value="${webhook.delay || 0}" min="0" 
                   style="width: 80px;" placeholder="延迟(秒)">
        </div>
        <div class="webhook-actions">
            <button class="btn btn-sm btn-danger" onclick="deleteWebhook(this)">删除</button>
        </div>
    `;
    
    // 添加复选框change事件监听
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', updateSelectAllState);
    
    return li;
}

// 修改 DOMContentLoaded 事件处理函数
document.addEventListener('DOMContentLoaded', function() {
    // 初始化日期时间选择器
    flatpickr("#triggerDateTime", {
        locale: "zh",
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today"
    });

    // 加载保存的webhook列表
    loadWebhooks();

    // 加载保存的链接列表
    loadLinks();

    // 加载存储的webhook列表
    loadWebhookStorage();

    // 初始化所有的 Sortable
    initializeSortables();

    // 添加webhook表单提交处理
    document.getElementById('webhookForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('webhookName').value;
        const url = document.getElementById('webhookUrl').value;
        addWebhook(name, url);
        this.reset();
    });

    // 修改定时触发按钮的事件监听
    document.getElementById('triggerButton').addEventListener('click', () => triggerWebhooks(false));

    // 添加立即触发按钮的事件监听
    document.getElementById('immediateButton').addEventListener('click', () => triggerWebhooks(true));

    // 添加保存到存储按钮事件
    document.getElementById('saveToStorage').addEventListener('click', function(e) {
        e.preventDefault();
        const name = document.getElementById('webhookName').value;
        const url = document.getElementById('webhookUrl').value;
        if (name && url) {
            addWebhookToStorage(name, url);
            document.getElementById('webhookForm').reset();
        }
    });

    // 添加全选功能
    document.getElementById('selectAll').addEventListener('change', function(e) {
        const checkboxes = document.querySelectorAll('#webhookList input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    // 添加批量设置延迟功能
    document.getElementById('applyBatchDelay').addEventListener('click', function() {
        const delay = document.getElementById('batchDelay').value;
        if (delay === '') {
            alert('请输入延迟时间');
            return;
        }

        const selectedItems = document.querySelectorAll('#webhookList input[type="checkbox"]:checked');
        if (selectedItems.length === 0) {
            alert('请选择要修改的webhook');
            return;
        }

        selectedItems.forEach(checkbox => {
            const li = checkbox.closest('li');
            const delayInput = li.querySelector('.delay-input');
            delayInput.value = delay;
        });

        // 保存更新后的列表
        const webhooks = Array.from(document.querySelectorAll('#webhookList li')).map(li => ({
            name: li.querySelector('.fw-bold').textContent,
            url: li.querySelector('.text-muted').textContent,
            delay: parseInt(li.querySelector('.delay-input').value) || 0
        }));
        saveWebhooks(webhooks);
    });

    // 监听webhook列表的变化，更新全选状态
    const webhookList = document.getElementById('webhookList');
    const observer = new MutationObserver(function() {
        updateSelectAllState();
    });
    observer.observe(webhookList, { childList: true, subtree: true });

    // 添加搜索功能
    document.getElementById('storageSearch').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        filterWebhookStorage(searchTerm);
    });

    // 添加链接表单提交处理
    document.getElementById('linkForm').addEventListener('submit', function(e) {
        e.preventDefault(); // 阻止表单默认提交行为
        const name = document.getElementById('linkName').value;
        const url = document.getElementById('linkUrl').value;
        if (name && url) {
            addLink(name, url);
            this.reset();
        }
    });

    // 添加批量删除按钮事件
    document.getElementById('batchDelete').addEventListener('click', async function() {
        const selectedItems = document.querySelectorAll('#webhookList input[type="checkbox"]:checked');
        if (selectedItems.length === 0) {
            alert('请选择要删除的webhook');
            return;
        }

        if (!confirm(`确定要删除选中的 ${selectedItems.length} 个webhook吗？`)) {
            return;
        }

        try {
            // 收集所有选中项的索引
            const items = Array.from(selectedItems).map(checkbox => checkbox.closest('li'));
            const indices = items.map(item => 
                Array.from(item.parentElement.children).indexOf(item)
            );

            // 按索引从大到小排序，这样删除时不会影响其他项的索引
            indices.sort((a, b) => b - a);

            // 依次删除每个选中的webhook
            for (const index of indices) {
                await fetch(`http://localhost:3000/api/webhooks/${index}`, {
                    method: 'DELETE'
                });
            }

            // 从DOM中移除选中的项
            items.forEach(item => item.remove());

            // 更新全选状态
            updateSelectAllState();
        } catch (error) {
            console.error('批量删除失败:', error);
            alert('删除失败，请重试');
        }
    });
});

// 添加更新全选状态的函数
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#webhookList input[type="checkbox"]');
    const checkedBoxes = document.querySelectorAll('#webhookList input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// 保存webhook到服务器
async function saveWebhooks(webhooks) {
    try {
        const webhooksData = Array.from(document.querySelectorAll('#webhookList li')).map(li => ({
            name: li.querySelector('.fw-bold').textContent,
            url: li.querySelector('.text-muted').textContent,
            delay: parseInt(li.querySelector('.delay-input').value) || 0
        }));
        
        await fetch('http://localhost:3000/api/webhooks', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhooksData)
        });
    } catch (error) {
        console.error('保存webhook失败:', error);
        alert('保存失败，请重试');
    }
}

// 从服务器加载webhook
async function loadWebhooks() {
    try {
        const response = await fetch('http://localhost:3000/api/webhooks');
        const webhooks = await response.json();
        const webhookList = document.getElementById('webhookList');
        webhookList.innerHTML = '';
        webhooks.forEach(webhook => {
            addWebhookToList(webhook);
        });
    } catch (error) {
        console.error('加载webhook失败:', error);
        alert('加载失败，请刷新页面重试');
    }
}

// 添加新的webhook
async function addWebhook(name, url) {
    try {
        await fetch('http://localhost:3000/api/webhooks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, url, delay: 0 })
        });
        addWebhookToList({ name, url, delay: 0 });
    } catch (error) {
        console.error('添加webhook失败:', error);
        alert('添加失败，请重试');
    }
}

// 修改 addWebhookToList 函数以使用新的创建函数
function addWebhookToList(webhook) {
    const li = createWebhookElement(webhook);
    document.getElementById('webhookList').appendChild(li);
}

// 删除webhook
async function deleteWebhook(button) {
    const li = button.closest('li');
    const index = Array.from(li.parentElement.children).indexOf(li);
    try {
        await fetch(`http://localhost:3000/api/webhooks/${index}`, {
            method: 'DELETE'
        });
        li.remove();
    } catch (error) {
        console.error('删除webhook失败:', error);
        alert('删除失败，请重试');
    }
}

// 触发选中的webhook
async function triggerWebhooks(immediate = false) {
    const triggerButton = document.getElementById('triggerButton');
    const immediateButton = document.getElementById('immediateButton');
    
    // 如果当前是取消状态
    if (triggerTimer) {
        clearTimeout(triggerTimer);
        triggerTimer = null;
        triggerButton.textContent = '定时触发';
        triggerButton.classList.remove('btn-secondary');
        triggerButton.classList.add('btn-success');
        immediateButton.disabled = false;
        isTriggering = false;
        enableWebhookList(); // 启用列表操作
        return;
    }

    const selectedWebhooks = Array.from(document.querySelectorAll('#webhookList li'))
        .filter(li => li.querySelector('input[type="checkbox"]').checked);
    
    if (selectedWebhooks.length === 0) {
        alert('请选择要触发的webhook');
        return;
    }

    let scheduledTime = new Date().getTime();
    
    if (!immediate) {
        const triggerTime = document.getElementById('triggerDateTime').value;
        if (!triggerTime) {
            alert('请选择触发时间');
            return;
        }
        scheduledTime = new Date(triggerTime).getTime();
        const now = new Date().getTime();
        
        if (scheduledTime < now) {
            alert('触发时间不能早于当前时间');
            return;
        }
    }

    // 更新按钮状态
    if (!immediate) {
        triggerButton.textContent = '取消';
        triggerButton.classList.remove('btn-success');
        triggerButton.classList.add('btn-secondary');
    }
    immediateButton.disabled = true;

    // 设置触发状态并禁用列表操作
    isTriggering = true;
    disableWebhookList();

    // 设置所有选中的webhook为等待状态
    selectedWebhooks.forEach(webhook => {
        webhook.className = 'list-group-item webhook-item status-pending';
        webhook.querySelector('.webhook-status').textContent = '未触发';
    });

    const executeWebhooks = async () => {
        try {
            // 按顺序触发webhook
            for (const webhook of selectedWebhooks) {
                webhook.className = 'list-group-item webhook-item status-triggering';
                webhook.querySelector('.webhook-status').textContent = '触发中...';

                const urlString = webhook.querySelector('.webhook-content').children[1].textContent;
                const delay = parseInt(webhook.querySelector('.delay-input').value) || 0;

                try {
                    // 解析URL和认证信息
                    const url = new URL(urlString);
                    let headers = {
                        'Content-Type': 'application/json'
                    };

                    // 如果URL中包含认证信息，将其转换为Authorization头
                    if (url.username || url.password) {
                        const credentials = btoa(`${url.username}:${url.password}`);
                        headers['Authorization'] = `Basic ${credentials}`;
                        
                        // 创建新的URL，移除认证信息
                        url.username = '';
                        url.password = '';
                    }

                    // 发送 POST 请求
                    const response = await fetch(url.toString(), {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            triggerTime: new Date().toISOString(),
                            source: 'webhook-manager'
                        })
                    });
                    
                    if (!response.ok) {
                        // 获取错误响应内容
                        let errorText = '';
                        try {
                            const errorResponse = await response.text();
                            errorText = errorResponse;
                        } catch (e) {
                            errorText = '无法获取错误详情';
                        }

                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                    }

                    webhook.className = 'list-group-item webhook-item status-triggered';
                    webhook.querySelector('.webhook-status').textContent = `已触发 (${response.status})`;
                    
                    // 如果不是最后一个webhook且有延迟，则等待指定的延迟时间
                    if (delay > 0 && webhook !== selectedWebhooks[selectedWebhooks.length - 1]) {
                        await new Promise(resolve => setTimeout(resolve, delay * 1000));
                    }
                } catch (error) {
                    console.error('触发webhook失败:', error);
                    webhook.className = 'list-group-item webhook-item status-error';
                    webhook.querySelector('.webhook-status').textContent = '触发失败';

                    // 显示错误弹窗
                    const webhookName = webhook.querySelector('.fw-bold').textContent;
                    const dialogContent = document.createElement('div');
                    dialogContent.innerHTML = `
                        <div class="alert alert-danger mb-0">
                            <h6 class="alert-heading">错误详情：</h6>
                            <hr>
                            <pre class="mb-0" style="white-space: pre-wrap;">${error.message}</pre>
                        </div>
                    `;
                    
                    await showDialog('触发失败', dialogContent);
                }
            }
        } finally {
            // 重置按钮和状态
            triggerButton.textContent = '定时触发';
            triggerButton.classList.remove('btn-secondary');
            triggerButton.classList.add('btn-success');
            immediateButton.disabled = false;
            triggerTimer = null;
            isTriggering = false;
            enableWebhookList(); // 启用列表操作
        }
    };

    if (immediate) {
        // 立即执行
        await executeWebhooks();
    } else {
        // 定时执行
        triggerTimer = setTimeout(executeWebhooks, scheduledTime - new Date().getTime());
    }
}

// 从服务器加载链接
async function loadLinks() {
    try {
        const response = await fetch('http://localhost:3000/api/links');
        const links = await response.json();
        const linkList = document.getElementById('linkList');
        linkList.innerHTML = '';
        links.forEach(link => {
            addLinkToList(link);
        });
    } catch (error) {
        console.error('加载链接失败:', error);
        alert('加载链接失败，请刷新页面重试');
    }
}

// 添加新的链接
async function addLink(name, url) {
    try {
        const response = await fetch('http://localhost:3000/api/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, url })
        });

        if (!response.ok) {
            throw new Error('添加链接失败');
        }

        // 直接添加到列表中，不需要重新加载
        addLinkToList({ name, url });
    } catch (error) {
        console.error('添加链接失败:', error);
        alert('添加失败，请重试');
    }
}

// 添加链接到列表中
function addLinkToList(link) {
    const div = document.createElement('div');
    div.className = 'list-group-item d-flex justify-content-between align-items-center';
    div.innerHTML = `
        <a href="${link.url}" target="_blank" class="flex-grow-1 text-decoration-none">
            <span class="fw-bold">${link.name}</span>
            <span class="text-muted ms-2">${link.url}</span>
        </a>
        <button class="btn btn-sm btn-danger ms-2" onclick="deleteLink(this)">删除</button>
    `;
    document.getElementById('linkList').appendChild(div);
}

// 删除链接
async function deleteLink(button) {
    const item = button.closest('.list-group-item');
    const index = Array.from(item.parentElement.children).indexOf(item);
    try {
        await fetch(`http://localhost:3000/api/links/${index}`, {
            method: 'DELETE'
        });
        item.remove();
    } catch (error) {
        console.error('删除链接失败:', error);
        alert('删除失败，请重试');
    }
}

// 从服务器加载webhook存储列表
async function loadWebhookStorage() {
    try {
        const response = await fetch('http://localhost:3000/api/webhook-storage');
        const data = await response.json();
        const storageList = document.getElementById('webhookStorage');
        storageList.innerHTML = '';
        
        // 添加新建分组按钮
        const addGroupDiv = document.createElement('div');
        addGroupDiv.className = 'mb-3';
        addGroupDiv.innerHTML = `
            <button class="btn btn-sm btn-outline-primary w-100" onclick="addNewGroup()">
                <i class="bi bi-plus"></i> 新建分组
            </button>
        `;
        storageList.appendChild(addGroupDiv);

        // 渲染所有分组
        data.groups.forEach(group => {
            addGroupToList(group);
        });

        // 保持搜索状态
        const searchTerm = document.getElementById('storageSearch').value.toLowerCase();
        if (searchTerm) {
            filterWebhookStorage(searchTerm);
        }
    } catch (error) {
        console.error('加载webhook存储列表失败:', error);
    }
}

// 添加新分组
async function addNewGroup() {
    const groupName = prompt('请输入分组名称');
    if (!groupName) return;

    try {
        const response = await fetch('http://localhost:3000/api/webhook-storage/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: groupName,
                id: 'group_' + Date.now(),
                expanded: true,
                webhooks: []
            })
        });
        
        if (response.ok) {
            loadWebhookStorage(); // 重新加载列表
        }
    } catch (error) {
        console.error('添加分组失败:', error);
        alert('添加分组失败，请重试');
    }
}

// 添加分组到列表
function addGroupToList(group) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'webhook-storage-group mb-3';
    groupDiv.dataset.groupId = group.id;
    
    groupDiv.innerHTML = `
        <div class="group-header d-flex align-items-center mb-2">
            <button class="btn btn-sm btn-link p-0 me-2 toggle-group" onclick="toggleGroup('${group.id}')">
                <i class="bi ${group.expanded ? 'bi-chevron-down' : 'bi-chevron-right'}"></i>
            </button>
            <span class="group-name">${group.name}</span>
            <div class="ms-auto">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteGroup('${group.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        <ul class="list-group webhook-list ${group.expanded ? '' : 'd-none'}" data-group="${group.id}">
            ${group.webhooks.map(webhook => `
                <li class="list-group-item webhook-storage-item" data-name="${webhook.name}" data-url="${webhook.url}">
                    <div class="webhook-content">
                        <div class="fw-bold">${webhook.name}</div>
                        <div class="text-muted" title="${webhook.url}">${webhook.url}</div>
                    </div>
                    <div class="webhook-actions">
                        <button class="btn btn-sm btn-danger" onclick="deleteWebhookFromStorage(this, '${group.id}')">删除</button>
                    </div>
                </li>
            `).join('')}
        </ul>
    `;
    
    document.getElementById('webhookStorage').appendChild(groupDiv);
    
    // 为每个分组的webhook列表初始化拖拽
    const webhookList = groupDiv.querySelector('.webhook-list');
    new Sortable(webhookList, {
        group: {
            name: 'webhook-lists',
            pull: 'clone',
            put: false
        },
        sort: false,
        animation: 150
    });
}

// 切换分组展开/折叠
async function toggleGroup(groupId) {
    const groupDiv = document.querySelector(`[data-group-id="${groupId}"]`);
    const webhookList = groupDiv.querySelector('.webhook-list');
    const toggleButton = groupDiv.querySelector('.toggle-group i');
    
    const isExpanded = !webhookList.classList.contains('d-none');
    webhookList.classList.toggle('d-none');
    toggleButton.className = `bi bi-chevron-${isExpanded ? 'right' : 'down'}`;
    
    // 更新服务器端的展开状态
    try {
        await fetch(`http://localhost:3000/api/webhook-storage/groups/${groupId}/toggle`, {
            method: 'PUT'
        });
    } catch (error) {
        console.error('更新分组状态失败:', error);
    }
}

// 删除分组
async function deleteGroup(groupId) {
    if (!confirm('确定要删除这个分组吗？')) return;
    
    try {
        await fetch(`http://localhost:3000/api/webhook-storage/groups/${groupId}`, {
            method: 'DELETE'
        });
        loadWebhookStorage(); // 重新加载列表
    } catch (error) {
        console.error('删除分组失败:', error);
        alert('删除分组失败，请重试');
    }
}

// 修改 addWebhookToStorage 函数
async function addWebhookToStorage(name, url) {
    try {
        // 获取所有分组
        const response = await fetch('http://localhost:3000/api/webhook-storage');
        const data = await response.json();
        
        // 创建分组选择对话框
        const groupSelect = document.createElement('select');
        groupSelect.className = 'form-select';
        data.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            groupSelect.appendChild(option);
        });

        // 创建对话框容器
        const dialogDiv = document.createElement('div');
        dialogDiv.innerHTML = `
            <div class="mb-3">
                <label class="form-label">选择分组</label>
                ${groupSelect.outerHTML}
            </div>
        `;

        // 显示选择对话框并获取选中的分组ID，传入 true 示这是选择对话框
        const selectedGroupId = await showDialog('选择分组', dialogDiv, true);
        if (!selectedGroupId) return;

        // 发送请求添加webhook到选定分组
        const addResponse = await fetch('http://localhost:3000/api/webhook-storage/webhooks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                groupId: selectedGroupId,
                webhook: { name, url }
            })
        });

        if (!addResponse.ok) {
            throw new Error('添加失败');
        }
        
        loadWebhookStorage(); // 重新加载整个列表
    } catch (error) {
        console.error('添加到存储列表失败:', error);
        alert('添加失败，请重试');
    }
}

// 修改 showDialog 函数
function showDialog(title, content, hasSelect = false) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'modal fade show';
        dialog.style.display = 'block';
        dialog.style.backgroundColor = 'rgba(0,0,0,0.5)';
        
        dialog.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${content.outerHTML || content}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary">${hasSelect ? '添加' : '关闭'}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 获取对话框中的select元素
        const select = dialog.querySelector('select');
        
        // 添加事件监听器
        const closeBtn = dialog.querySelector('.btn-close');
        const cancelBtn = dialog.querySelector('.btn.btn-secondary');
        const confirmBtn = dialog.querySelector('.btn.btn-primary');

        const closeDialog = (result) => {
            const selectedValue = result && select ? select.value : null;
            dialog.remove();
            resolve(selectedValue);
        };

        closeBtn.onclick = () => closeDialog(false);
        cancelBtn.onclick = () => closeDialog(false);
        confirmBtn.onclick = () => closeDialog(true);

        // 点击背景关闭对话框
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                closeDialog(false);
            }
        };
    });
}

// 修改 deleteWebhookFromStorage 函数
async function deleteWebhookFromStorage(button, groupId) {
    const li = button.closest('li');
    const index = Array.from(li.parentElement.children).indexOf(li);
    try {
        await fetch(`http://localhost:3000/api/webhook-storage/groups/${groupId}/webhooks/${index}`, {
            method: 'DELETE'
        });
        li.remove();
    } catch (error) {
        console.error('从存储列表删除失败:', error);
        alert('删除失败，请重试');
    }
}

// 添加禁用列表操作的函数
function disableWebhookList() {
    const webhookList = document.getElementById('webhookList');
    
    // 禁用所有复选框
    webhookList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = true;
    });
    
    // 禁用所有延迟输入框
    webhookList.querySelectorAll('.delay-input').forEach(input => {
        input.disabled = true;
    });
    
    // 禁用批量操作工具栏
    document.getElementById('selectAll').disabled = true;
    document.getElementById('batchDelay').disabled = true;
    document.getElementById('applyBatchDelay').disabled = true;
    document.getElementById('batchDelete').disabled = true;

    // 禁用拖拽功能
    if (webhookList.sortable) {
        webhookList.sortable.option("disabled", true);
    }
}

// 添加启用列表操作的函数
function enableWebhookList() {
    const webhookList = document.getElementById('webhookList');
    
    // 启用所有复选框
    webhookList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = false;
    });
    
    // 启用所有延迟输入框
    webhookList.querySelectorAll('.delay-input').forEach(input => {
        input.disabled = false;
    });
    
    // 启用批量操作工具栏
    document.getElementById('selectAll').disabled = false;
    document.getElementById('batchDelay').disabled = false;
    document.getElementById('applyBatchDelay').disabled = false;
    document.getElementById('batchDelete').disabled = false;

    // 启用拖拽功能
    if (webhookList.sortable) {
        webhookList.sortable.option("disabled", false);
    }
}

// 添加过滤函数
function filterWebhookStorage(searchTerm) {
    const groups = document.querySelectorAll('.webhook-storage-group');
    
    groups.forEach(group => {
        const webhooks = group.querySelectorAll('.webhook-storage-item');
        let hasVisibleWebhooks = false;

        webhooks.forEach(webhook => {
            const name = webhook.querySelector('.fw-bold').textContent.toLowerCase();
            const url = webhook.querySelector('.text-muted').textContent.toLowerCase();
            const isMatch = name.includes(searchTerm) || url.includes(searchTerm);
            
            webhook.style.display = isMatch ? '' : 'none';
            if (isMatch) hasVisibleWebhooks = true;
        });

        // 如果组内没有匹配的webhook，隐藏整个组
        group.style.display = hasVisibleWebhooks ? '' : 'none';
    });
} 