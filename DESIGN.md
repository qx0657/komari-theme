# Glow Komari theme

<!-- impeccable:design-schema 1 -->

Junimo 2.0.2 的 Glow 分支。视觉世界是深色卡片（16px 圆角、四格总览、大卡三网延迟），另有一版像素农场外观。默认外观是深色。

配置说明见 [docs/shareable-template.md](./docs/shareable-template.md)。

## Surfaces

- `/` 节点首页。节点卡片标题旁复制 IP（悬停才显示地址）。V4 后是 IP 属性标签。总览第四张卡：全部账单的剩余价值 + 月均。其下 ISP IP余量卡、域名卡、机场卡；大屏一行（机场卡更宽，条目两列）。没有对应条目就不显示。机场套餐、每月额度和重置日写在条目上。用量接口给出订阅流量时显示已用/总量；没有已用时仍显示每月额度。
- `/?view=isp` IProyal 流量；`enableIspStrip` 关闭或 `/isp/api` 失败时回首页。Token 不在 theme_settings。
- `/assets` 节点 + ISP + 域名 + 机场同一张账本。

## Tokens

沿用 Junimo `src/styles/tokens.css`。新增块只用 `--surface-a`、`--hairline`、`--text-*`、`--status-*`、`--progress-network`。

## Provenance

本地复核截图放在 `.impeccable/review/`，不进版本库。
