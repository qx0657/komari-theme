# Glow

[Junimo](https://github.com/vaspike/junimo) 2.0.2 的 Komari 主题分支（Apache-2.0）。保留节点卡片、三网延迟和资产概览，并加上域名、机场和 IProyal 余量。

默认外观是深色。右下角可以换成浅色、跟随系统或像素农场。

个人账单、节点备注和订阅地址不在这个仓库里。装上之后到主题管理页自己填。空列表不会带出示例数据。

## 机场流量

每条机场可以写套餐、每月重置日和每月额度（GB）。

- 用量接口返回了 `upload` / `download` / `total`：首页直接显示已用 / 总量，并画用量条。
- 只有总量、没有已用，或者接口没配：显示「未知 / 每月额度」。
- 额度和用量都没有：只显示价格和到期。

用量接口是主题设置里的同源路径，例如 `/usage/airports.json`。它应返回：

```json
{
  "sources": [
    { "id": "alpha", "upload": 1073741824, "download": 2147483648, "total": 107374182400 }
  ]
}
```

`upload`、`download`、`total` 是订阅响应头 `subscription-userinfo` 里的字节数。条目上的「用量来源 ID」对上 `id`；留空时用条目自己的 id。

订阅地址带令牌，不要写进主题设置，也不要让浏览器直接请求订阅。由你自己的服务去拉，再只把上面的字段给主题。`{ "probe": { "sources": [] } }` 这种包一层的 JSON 也可以。

## ISP

首页 ISP 卡和 `/?view=isp` 只接 IProyal，并且需要同源 `/isp/api`。接口失败或没有 ISP 条目时，首页不显示这张卡。Token 在主题管理页提交到 `/isp/api/admin/credentials`，不会进 `theme_settings`。

## 开发

```bash
npm install
npm test
npm run package
```

`npm run package` 生成 `Glow-vX.Y.Z.zip`。zip 不进 git。在 Komari 后台上传这个包，主题 short 必须是 `Glow`。重新上传不会清掉已经保存的主题设置。

本地预览：`npm run dev`，打开 `/?mock=1`。

## 许可

Apache-2.0。上游 Junimo 与 NOTICE 保留在仓库里。
