# webhook-manager
This project is used for batch management webhook list and scheduled triggering tasks 
用于管理webhook清单和设置定时触发任务

## 安装依赖和运行
```
npm install express cors
node server.js
```
## 使用说明
- 输入名称和Webhook URL
- 点击“添加到清单”可加入到执行清单区域
- 点击“添加到存储”可加入到左侧存储列表
- 可从存储列表拖动到webhook触发清单
- 存储列表支持分组和搜索
- 存储清单中，每条webhook均可设置延迟时间，即先触发再等待延迟后执行下一条
- 触发时会根据选中的列表依次触发
- 定时触发，顾名思义。不要关闭页面，不支持后台触发
- 立即触发，顾名思义。
- 可支持清单批量设置延迟时间和批量删除。
- 所有数据本地json保存
- logo（100*100）可以替换public目录下的logo.svg（我是直接用的Jenkins的）
![image](https://github.com/user-attachments/assets/b631d2f1-139b-425d-ab05-afcac8c9cc3e)
