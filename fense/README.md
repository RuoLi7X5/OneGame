# 分色调度玩法：难度梯度与关卡生成机制

## 难度梯度
- 颜色集合递进：`colorsForLevel(level)` 控制每关启用的颜色数量与种类，随等级提升依次加入 `red/cyan/pink/purple`。
- 生成节奏递进：`intervalMs` 从 2500ms 逐步降低至 800ms，且引入波浪式压力——每 5 关（5, 10, 15...）作为“高压关”，间隔缩短 20%。
- 速度递进：箱子基础速度从 70 随等级提升至 130，考验反应。
- 箱子总数递进：1..10 关线性增长，11..20 关加速增长，20+ 关继续增加至 50+，保证后期流程长度。
- 错误容忍度：前期 3 次，16-30 关放宽至 4 次，30+ 关放宽至 5 次，平衡高流量下的容错率。
- 通关判定：`targetCorrect = max(12, round(count*0.80))`。

## 变量参数与变化机制
- 颜色分布：均匀分布 `autoDistribution(colors)`，见 `fense/levels.js:17`。
- 路口类型与数量：`junctionPlan(level)` 决定 T 路口与三向路口数量，随等级阶梯增长，并限制总路口数 3..10，见 `fense/levels.js:31`。
- 布局变体参数：`pickVariantParams(level)` 依据关卡号选择
  - `orientation`（入口方位与主干方向）：四向循环 `verticalTop / verticalBottom / horizontalLeft / horizontalRight`，见 `fense/levels.js:38`。
  - `warehouseSideMode`（仓库侧模式）：每 4 关循环 `alternate / singleA / singleB`（交替 / 单侧 A / 单侧 B），见 `fense/levels.js:39`。

## 布局生成机制
- 生成入口与主干：`buildSpec(level)` 根据 `orientation` 决定主干是垂直还是水平，并放置按序编号的 `switch` 节点，见 `fense/levels.js:46`。
- 仓库布置：
  - 垂直主干：左右两侧布置仓库，`warehouseSideMode` 控制交替或单侧，见 `fense/levels.js:63`。
  - 水平主干：上下两侧布置仓库，`warehouseSideMode` 控制交替或单侧，见 `fense/levels.js:139`。
- 分支容量：按 `junctionPlan` 的 `tCount/xSlots` 生成每个路口的“可挂仓库数量”模式，从而决定颜色仓库如何分配到各路口，见 `fense/levels.js:64`。
- 轨道边与道岔选项：为每个路口构建到下一个路口或其挂接仓库的边，并生成 `switch.options`（最多 3 个），见 `fense/levels.js:82` 与 `fense/levels.js:153`。
- 镜像与旋转：`verticalBottom` 通过对 Y 轴坐标镜像实现“下方入口”布局，见 `fense/levels.js:91`。
- 导出关卡集：`LEVELS` 将 1..40 关按上述规则生成，并合并难度参数，见 `fense/levels.js:386`。

## 运行与渲染
- 运行载入：主页选择关卡后将生成的 `LEVELS` 项传入 `initGame(lv)`，见 `fense/main.js:373` 与 `fense/main.js:13`。
- 渲染逻辑：根据 `nodes/edges/switches` 绘制轨道、仓库、箱子流动与道岔路径高亮，见 `fense/main.js:162`、`fense/main.js:192`、`fense/main.js:222`。
- 生成与判定：按 `spawn` 规则生成箱子，进入正确仓库累积 `correct`，错误累积 `errors`，结算在 `onLevelEnd()`，见 `fense/main.js:33`、`fense/main.js:111`、`fense/main.js:389`。

## 可定制与覆盖
- 精细指定变体：可在 `pickVariantParams` 引入基于关卡号的映射表，或新建 `LEVEL_OVERRIDES` 对象，为特定关卡覆盖 `orientation/warehouseSideMode`。
- 手工关卡：沿用 `LEVEL_SPECS` 的静态结构格式追加手工关卡条目，见 `fense/levels.js:82`。

## 术语与数据结构
- 节点 `nodes`: `entrance / switch / warehouse`，每个含 `pos` 与类型字段。
- 边 `edges`: `{ from, to }` 定义可达路径。
- 道岔 `switches`: `{ nodeId, options, selectedIndex }`，`options` 指向后继节点或仓库。
- 难度 `spawn/rules`: `{ count, intervalMs, distribution, speed }` 与 `{ maxErrors, targetCorrect }`。
