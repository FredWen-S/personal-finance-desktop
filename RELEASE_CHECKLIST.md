# Release Checklist

## A. 构建检查

- [ ] `npm install`
- [ ] `npm run build`
- [ ] `npm run tauri -- info`
- [ ] `npm run tauri build`

## B. 基础功能检查

- [ ] Accounts 新增 / 编辑 / 停用 / 删除保护
- [ ] Transactions 支出 / 收入 / 转账 / 编辑 / 删除余额一致性
- [ ] Points earn / redeem / edit / delete 余额一致性
- [ ] Activities 新增 / 编辑 / 状态快捷操作 / 删除
- [ ] Dashboard 汇总数据正确
- [ ] Reports 图表可加载
- [ ] Settings JSON / CSV 导出可保存

## C. 数据安全检查

- [ ] 有流水账户不能物理删除
- [ ] 有积分流水账户不能物理删除
- [ ] 删除流水会反向恢复余额
- [ ] 编辑流水会先撤销旧影响再应用新影响
- [ ] 导出取消不会报错
- [ ] 数据库文件不提交到 Git

## D. 打包检查

- [ ] exe 可启动
- [ ] 安装包可生成
- [ ] 安装后应用可启动
- [ ] 数据库在 AppData 应用目录
- [ ] 未签名应用可能触发 Windows SmartScreen

## E. 安装版实机 QA

### 安装与启动

- [ ] NSIS 安装包可运行
- [ ] Windows 可能提示未签名安全提醒
- [ ] 安装后应用可启动
- [ ] 应用标题为 Personal Finance Manager
- [ ] 左侧菜单可正常切换

### Accounts

- [ ] 新增账户 A，余额 1000
- [ ] 新增账户 B，余额 100
- [ ] 编辑账户备注
- [ ] 停用 / 启用账户
- [ ] 无流水账户可以删除
- [ ] 有流水账户不能物理删除，只能停用

### Transactions

- [ ] A 新增 expense 50，余额变 950
- [ ] A 新增 income 200，余额变 1150
- [ ] A 转账 100 到 B，A 变 1050，B 变 200
- [ ] 编辑 expense 50 为 80，余额正确变化
- [ ] 删除 income 200，余额正确回滚
- [ ] transfer / adjustment 不计入收入支出统计

### Points

- [ ] 新增 Flying Blue，余额 10000
- [ ] earn 5000 后余额 15000
- [ ] redeem 3000 后余额 12000
- [ ] 编辑 redeem 后余额正确变化
- [ ] 删除 earn 后余额正确回滚
- [ ] 有积分流水的积分账户不能物理删除，只能停用

### Activities

- [ ] 新增 Chase Offer
- [ ] 新增 Choice 酒店促销
- [ ] 新增学生优惠
- [ ] 修改 estimated_cost / estimated_value
- [ ] 标记 joined / completed / skipped
- [ ] 未来 30 天内截止活动显示正常

### Dashboard

- [ ] 总资产 / 总负债 / 净资产正确
- [ ] 本月收入 / 支出 / 净流入正确
- [ ] 最近流水显示账户名称
- [ ] 即将截止活动显示正确
- [ ] 即将过期积分显示正确

### Reports

- [ ] 现金流趋势图可显示
- [ ] 支出分类饼图可显示
- [ ] 账户余额图可显示
- [ ] 积分估值图可显示
- [ ] 活动状态图可显示
- [ ] Top 商户图可显示
- [ ] 切换月份不报错

### Settings

- [ ] 表数量统计正确
- [ ] 导出完整 JSON 成功
- [ ] 导出 accounts CSV 成功
- [ ] 导出 transactions CSV 成功
- [ ] 导出 point_programs CSV 成功
- [ ] 导出 point_transactions CSV 成功
- [ ] 导出 activities CSV 成功
- [ ] 取消保存对话框不报错
- [ ] 导出的 JSON / CSV 可以被文本编辑器打开

### 持久化

- [ ] 关闭应用后重新打开，数据仍存在
- [ ] 安装版数据库位于 AppData 应用目录
- [ ] 源码目录没有生成 finance.db
