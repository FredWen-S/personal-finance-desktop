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
