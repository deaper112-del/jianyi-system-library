# 北京简一系统库

首页有两个入口。每个程序在本页里全屏打开，顶栏可以回到分区和首页。

每个入口都通过同源代理嵌入**当时线上正在运行的发布地址**，不复制、不打包那些程序本体；对方重新发布后，下次打开库就会看到最新版本，无需重建本库。

| 入口 | 程序 | 线上来源 |
| --- | --- | --- |
| 自我提升 | 考试 | `online-exam.apps.grok.bot`（在 `team-wheel` 分支 / 发布记录中确认，非独立仓库） |
| 自我提升 | 读书 | `reading-corner.apps.grok.bot` |
| 欢乐空间 | MBTI职场性格测试游戏 | `mbti-workplace-quiz.apps.grok.bot` |
| 欢乐空间 | 团建幸运大转盘 | README 中的 `team-wheel.team-wheel.workers.dev`，备选 `team-wheel.apps.grok.bot` |

本地预览：

```bash
npm install
npm run dev
```

打开 http://127.0.0.1:4173
