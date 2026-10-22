# Glow Komari theme

<!-- impeccable:design-schema 1 -->

Junimo 2.0.2 的 Glow 分支。视觉世界是深色卡片（16px 圆角、四格总览、大卡三网延迟），另有一版像素农场外观。默认外观是深色。

配置说明见 [docs/shareable-template.md](./docs/shareable-template.md)。

## Surfaces

- `/` 节点首页。节点卡片标题旁复制 IP（悬停才显示地址）。V4 后是 IP 属性标签。地区栏中间按对筛选这些标签：原生/广播、机房/家宽、ISP/非ISP、直连/NAT。点一下只看这一侧，再点取消；多组和地区筛选一起生效。某一侧在当前列表里没有服务器时，这一对不出现。卡片上对得上的标签也可以点。总览第四张卡：全部账单的剩余价值 + 月均。其下 ISP IP余量卡、域名卡、机场卡；大屏一行（机场卡更宽，条目两列）。没有对应条目就不显示。机场套餐、每月额度和重置日写在条目上。用量接口给出订阅流量时显示已用/总量；没有已用时仍显示每月额度。
- `/?view=isp` IProyal 流量；`enableIspStrip` 关闭或 `/isp/api` 失败时回首页。Token 不在 theme_settings。
- `/assets` 节点 + ISP + 域名 + 机场同一张账本。
- 节点流量重置：流量条下用中性文本显示相对倒计时与月日，点开原地展开准确时刻、IANA 时区和每月规则。大卡、小卡保留日期；迷你卡和列表只显示倒计时，详情仍可展开。无限流量或未配置节点不占位。主题管理「卡片显示项」按有限额节点设置日、时刻、时区，29–31 日可设置月末、顺延次月 1 日或跳过短月；预览下一次重置时间，非法时区阻止保存。只负责展示，不改变 agent 清零。

## Tokens

沿用 Junimo `src/styles/tokens.css`。新增块只用 `--surface-a`、`--hairline`、`--text-*`、`--status-*`、`--progress-network`。

## Provenance

本地复核截图放在 `.impeccable/review/`，不进版本库。
