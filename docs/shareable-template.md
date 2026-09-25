# 配置

账单、IP 标签和机场额度都在 Komari 的主题设置里，不在主题包的默认值里。`theme_settings` 会随公开配置下发，所以只能放可以给人看见的字段。

## 缺省

| 输入 | 行为 |
|---|---|
| `extraAssets` 缺省 / 非数组 / `[]` | 空列表。首页不显示域名、机场、ISP 卡 |
| 已保存的非空列表 | 只用保存值。机场字段是 `plan`、`resetDayOfMonth`、`quotaGb`、`usageSourceId` |
| `ipProfiles` 缺省 / 非数组 / `[]` | 空列表 |
| `airportUsageUrl` 缺省 | 空。只显示每月额度 |
| 主题管理「填入示例」 | 列表为空时才出现，填的是通用示例 |

ISP 条目固定走 IProyal。Token 走 `POST /isp/api/admin/credentials`，不要写进 `theme_settings`。

## 机场用量

`airportUsageUrl` 只能是同源路径，例如 `/usage/airports.json`。带 `://`、查询串或 `..` 的值会被丢掉。

接口返回：

```json
{
  "sources": [
    { "id": "alpha", "upload": 0, "download": 0, "total": 107374182400 }
  ]
}
```

字节来自订阅响应头 `subscription-userinfo`。主题用条目的 `usageSourceId`（没有则用条目 id）去对 `sources[].id`。

- 有已用和总量：显示「已用 / 总量」
- 只有总量，或只有每月额度：显示「未知 / 总额」
- 都没有：显示价格和到期

订阅 URL 留在拉取用量的服务里。不要放进主题设置，也不要放进这个 JSON。
