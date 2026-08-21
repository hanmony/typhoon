# D6 向量化入库报告

- 生成时间：2026-08-18T23:12:27+08:00
- 生成脚本：`docs_import/index_docs.py`（契约对齐 codex D6 审查 5 条）
- Embedding：`Qwen/Qwen3-Embedding-8B`（1024 维）
- Qdrant 集合：`knowledge_base`，点总数 3002
- MongoDB：mongodb://localhost:27017/schooltyphoon，集合 `kbdocuments` / `kbchunks`
- 永久文本目录：`C:\Users\86182\Desktop\typhoon-data-db-audit\docs_import\text_permanent`（进 git，D8 不删除）
- 结果：72/72 份成功，3002 片全部向量化

## 契约落实

1. kb-chunks.documentId 与 Qdrant payload.documentId = Mongo _id 字符串（非 D5 临时键）
2. 幂等匹配按 sourceRelpath 映射出的 text_permanent 稳定相对键，与 kb-documents.filePath 后缀比较；不用文件名或工作树绝对根目录
3. kb-chunks 只写 documentId / chunkIndex / content / qdrantPointId 四个业务字段，另写 createdAt / updatedAt 标准时间戳
4. filePath 指向永久目录 text_permanent/，不指向 D8 会删除的临时目录
5. 删除旧数据前已完成 Embedding 连通性与 1024 维校验

## 敏感内容复核

- 永久 txt 脱敏替换：59 处
- 入库切片脱敏替换：62 处
- 脱敏范围：真实邮箱、带标签电话、明确联系人姓名；职责制度用语保留。

## 逐文档明细（Mongo _id ↔ 来源）

| Mongo _id | 文档 | 分类 | 切片数 |
|---|---|---|---|
| 6a84660fb1973cebabc6b3a4 | 【报运管部】指挥中心防御第6号台风“烟花”保障工作总结0729.docx | regulation | 9 |
| 6a846618b1973cebabc6b3ae | 【报运管部】运管中心防御第14号台风“灿都”保障工作总结0923.docx | regulation | 8 |
| 6a846621b1973cebabc6b3b7 | 附件8上海轨道交通台风天气下的正线存车实施方案.docx | regulation | 5 |
| 6a846632b1973cebabc6b3bd | 7月26日上海地铁部分线路暂停运营.pdf | regulation | 3 |
| 6a846638b1973cebabc6b3c1 | 8月11日上海地铁全路网恢复常态保驾.pdf | regulation | 1 |
| 6a846644b1973cebabc6b3c3 | 9月14日上海地铁部分线路暂停运营、限速运行.pdf | regulation | 4 |
| 6a84664bb1973cebabc6b3c8 | 做好7月12至13日暴雨天气预防工作（市领导指示版2）.pdf | regulation | 1 |
| 6a84665bb1973cebabc6b3ca | 加强台风“烟花”期间轨道交通线路洞口监控工作.pdf | regulation | 3 |
| 6a846665b1973cebabc6b3ce | 强化今夜明日本市大到暴雨的轨道交通防范工作(市领导指示版1).pdf | regulation | 4 |
| 6a846670b1973cebabc6b3d3 | 提升8月9日路网保驾等级.pdf | regulation | 1 |
| 6a84667bb1973cebabc6b3d5 | 关于做好2023年上海轨道交通防汛防台工作的通知.pdf | regulation | 11 |
| 6a84668ab1973cebabc6b3e1 | 关于做好汛期大范围运营调整或停运期间的指标统计及报送工作的相关事宜.docx | regulation | 4 |
| 6a846695b1973cebabc6b3e6 | 关于开展2023年上海轨道交通路网运营调度指挥中心汛前大检查活动的通知.pdf | regulation | 8 |
| 6a8466a3b1973cebabc6b3ef | 关于进一步加强2023年上海轨道交通路网运营调度指挥中心防汛防台工作的通知.pdf | regulation | 9 |
| 6a8466aeb1973cebabc6b3f9 | 防汛防台相关规章及处置要求.xls | regulation | 5 |
| 6a8466beb1973cebabc6b3ff | 上海轨道交通路网调度指挥中心运营线路防汛防台调度现场处置方案.pdf | emergency_plan | 26 |
| 6a8466dfb1973cebabc6b41a | 上海轨道交通路网运营调度指挥中心异物侵限调度现场处置方案.pdf | emergency_plan | 16 |
| 6a8466f2b1973cebabc6b42b | 上海轨道交通路网运营调度指挥中心运营线路气象灾害调度现场处置方案.pdf | emergency_plan | 14 |
| 6a846707b1973cebabc6b43a | 上海轨道交通路网运营调度指挥中心运营线路淹水倒灌调度现场处置方案.pdf | emergency_plan | 21 |
| 6a847524468165687578e810 | 上海轨道交通路网运营调度指挥中心防汛防台管理规定.pdf | regulation | 24 |
| 6a8467b9b1973cebabc6b469 | 申通地铁集团异物侵限专项应急预案.pdf | emergency_plan | 13 |
| 6a8467f0b1973cebabc6b477 | 申通地铁集团运营线路气象灾害专项应急预案.pdf | emergency_plan | 14 |
| 6a846800b1973cebabc6b486 | 申通地铁集团运营线路淹水倒灌专项应急预案.pdf | emergency_plan | 15 |
| 6a84681bb1973cebabc6b496 | 申通地铁集团运营线路防汛防台专项应急预案.pdf | emergency_plan | 29 |
| 6a846839b1973cebabc6b4b4 | 申通地铁集团运营线路防汛防台管理规定.pdf | regulation | 31 |
| 6a846858b1973cebabc6b4d4 | 历年台风影响事件.docx | regulation | 9 |
| 6a846864b1973cebabc6b4de | 切实做好2022年第11号台风“轩岚诺”防御工作.doc | regulation | 10 |
| 6a846872b1973cebabc6b4e9 | 加强台风“轩岚诺”影响期间轨道交通线网运营保障工作.docx | regulation | 4 |
| 6a846888b1973cebabc6b4ee | 9月14日上海地铁部分线路停运的预报.doc | regulation | 1 |
| 6a846899b1973cebabc6b4f0 | 9月15日上海地铁地面、高架区段首班车运营时间或将延至7时的预报.doc | regulation | 1 |
| 6a8468a9b1973cebabc6b4f2 | 关于2022年第12号台风“梅花”防御工作情况的报告V2.docx | regulation | 7 |
| 6a8468c2b1973cebabc6b4fa | 切实做好2022年第12号台风“梅花”防御工作.pdf | regulation | 9 |
| 6a8468deb1973cebabc6b504 | 台风事件汇总.docx | regulation | 3 |
| 6a8468eeb1973cebabc6b508 | “梅花”速报(06).doc | regulation | 1 |
| 6a8468f4b1973cebabc6b50a | “梅花”速报(07).doc | regulation | 1 |
| 6a8468fdb1973cebabc6b50c | “梅花”速报(08）(2).doc | regulation | 1 |
| 6a846907b1973cebabc6b50e | “梅花”速报(09）.doc | regulation | 1 |
| 6a846918b1973cebabc6b510 | “梅花”速报(11）.doc | regulation | 1 |
| 6a846929b1973cebabc6b512 | “梅花”速报(12）.doc | regulation | 1 |
| 6a846933b1973cebabc6b514 | “梅花”速报(14）.doc | regulation | 1 |
| 6a846947b1973cebabc6b516 | “梅花”速报(5).doc | regulation | 1 |
| 6a846956b1973cebabc6b518 | “梅花”速报（04）.doc | regulation | 1 |
| 6a84695db1973cebabc6b51a | 梅花.docx | regulation | 15 |
| 6a846973b1973cebabc6b52a | 限速区段.docx | regulation | 1 |
| 6a846982b1973cebabc6b52c | 附件9近年主要影响台风汇总表（2018年至2022年）.docx | regulation | 4 |
| 6a84698fb1973cebabc6b531 | 上海轨道交通路网运营调度指挥中心防汛防台专项应急预案.pdf | emergency_plan | 27 |
| 6a8469f6b1973cebabc6b54d | 调度指挥中心防御第12号台风“梅花”保障工作总结-运管部.docx | regulation | 15 |
| 6a846a0eb1973cebabc6b55d | 2013—2022年中国气象局热带气旋路径和强度预报误差.pdf | other | 57 |
| 6a846a50b1973cebabc6b597 | 2021年台风季全球和区域模型中西北太平洋台风路径预报的评估.pdf | other | 118 |
| 6a846ab9b1973cebabc6b60e | 不同气动构型对传统列车侧风稳定性的影响.pdf | other | 84 |
| 6a846b03b1973cebabc6b663 | 台风天气下地铁系统的客流量与人员流动：以中国福州为例.pdf | other | 94 |
| 6a846b53b1973cebabc6b6c2 | 台风天气下广州地铁线路停运及恢复时机探讨_张剑.pdf | other | 12 |
| 6a846b65b1973cebabc6b6cf | 在高速铁路网络发生重大中断时重新安排列车时刻表，并预留座位.pdf | other | 179 |
| 6a846bfcb1973cebabc6b783 | 地面沉降情景下大都市区地铁系统的洪水风险评估：以北京为例.pdf | other | 145 |
| 6a846c88b1973cebabc6b815 | 基于不同风模型的高速列车侧风稳定性评估.pdf | other | 98 |
| 6a846ccbb1973cebabc6b878 | 基于复杂系统视角，利用网格水动力模型和FBWMA方法分析地铁网络的淹没韧性：以武汉为例.pdf | other | 160 |
| 6a846d58b1973cebabc6b919 | 基于弹性的应急母线桥接和调度优化模型，以应对地铁运营中断.pdf | other | 99 |
| 6a846daeb1973cebabc6b97d | 基于智能卡数据的洪水事件中地铁出行风险评估.pdf | other | 109 |
| 6a846e04b1973cebabc6b9eb | 基于类似台风路径的台风降雨预报改进.pdf | other | 96 |
| 6a846e64b1973cebabc6ba4c | 基于集合预报系统选择性共识的概率热带气旋路径预报方案.pdf | other | 101 |
| 6a846ef6b1973cebabc6bab2 | 基于雷达回波的短期降雨预测：一种改进的自注意力PredRNN深度学习模型.pdf | other | 137 |
| 6a846f72b1973cebabc6bb3c | 我们是否已达到西北太平洋热带气旋路径可预测性的极限.pdf | other | 110 |
| 6a847068b1973cebabc6bbab | 整合台风卫星影像特征和台风眼地理坐标的台风路径预测模型.pdf | other | 101 |
| 6a8470bbb1973cebabc6bc11 | 未来海平面上升对交通基础设施造成的沿海洪水灾害损失估算.pdf | other | 114 |
| 6a847144b1973cebabc6bc84 | 考虑侧风对列车影响的框架.pdf | other | 135 |
| 6a84719fb1973cebabc6bd0c | 西北太平洋热带气旋路径预报技能的历史.pdf | other | 40 |
| 6a8471ccb1973cebabc6bd35 | 评估减少极端天气对基础设施网络影响的城市战略.pdf | other | 104 |
| 6a847222b1973cebabc6bd9e | 通过与公交服务的本地化整合增强地铁网络的弹性.pdf | other | 86 |
| 6a847271b1973cebabc6bdf5 | 通过混合数值模式风信息改进雷达回波拉格朗日外推临近预报：16个台风案例的统计性能.pdf | other | 123 |
| 6a8472c9b1973cebabc6be71 | 通过聚集台风路径评估区域台风灾害管理风险.pdf | other | 82 |
| 6a84730fb1973cebabc6bec4 | 铁路桥梁自适应玻璃钢风障结构的气动性能.pdf | other | 88 |
| 6a84735cb1973cebabc6bf1d | 铁路桥梁风障对行驶列车的防护效果：一项实验研究.pdf | other | 136 |

## 说明

- fileType 统一为 `txt`：filePath 指向永久清洗文本，平台重处理走 parseText。
- autoTags / summary 未生成（平台依赖 llm_models 的 LLM 配置），可由平台 listDocumentsWithoutMetadata 接口补齐。
