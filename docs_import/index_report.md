# D6 向量化入库报告

- 生成时间：2026-08-18T21:20:42+08:00
- 生成脚本：`docs_import/index_docs.py`（契约对齐 codex D6 审查 5 条）
- Embedding：`Qwen/Qwen3-Embedding-8B`（1024 维）
- Qdrant 集合：`knowledge_base`，点总数 3002
- MongoDB：mongodb://localhost:27017/schooltyphoon，集合 `kbdocuments` / `kbchunks`
- 永久文本目录：`C:\Users\86182\Desktop\typhoon-data-db-audit\docs_import\text_permanent`（进 git，D8 不删除）
- 结果：72/72 份成功，3002 片全部向量化

## 契约落实

1. kb-chunks.documentId 与 Qdrant payload.documentId = Mongo _id 字符串（非 D5 临时键）
2. 幂等匹配按 sourceRelpath（= kb-documents.filePath），不用文件名
3. kb-chunks 只写 documentId / chunkIndex / content / qdrantPointId 四字段
4. filePath 指向永久目录 text_permanent/，不指向 D8 会删除的临时目录
5. 删除旧数据前已完成 Embedding 连通性与 1024 维校验

## 逐文档明细（Mongo _id ↔ 来源）

| Mongo _id | 文档 | 分类 | 切片数 |
|---|---|---|---|
| 6a8450bd1a8c6bfd29207bf7 | 【报运管部】指挥中心防御第6号台风“烟花”保障工作总结0729.docx | regulation | 9 |
| 6a8450cc1a8c6bfd29207c01 | 【报运管部】运管中心防御第14号台风“灿都”保障工作总结0923.docx | regulation | 8 |
| 6a8450d71a8c6bfd29207c0a | 附件8上海轨道交通台风天气下的正线存车实施方案.docx | regulation | 5 |
| 6a8450e01a8c6bfd29207c10 | 7月26日上海地铁部分线路暂停运营.pdf | regulation | 3 |
| 6a8450e41a8c6bfd29207c14 | 8月11日上海地铁全路网恢复常态保驾.pdf | regulation | 1 |
| 6a8450ed1a8c6bfd29207c16 | 9月14日上海地铁部分线路暂停运营、限速运行.pdf | regulation | 4 |
| 6a8450f81a8c6bfd29207c1b | 做好7月12至13日暴雨天气预防工作（市领导指示版2）.pdf | regulation | 1 |
| 6a8451041a8c6bfd29207c1d | 加强台风“烟花”期间轨道交通线路洞口监控工作.pdf | regulation | 3 |
| 6a84510d1a8c6bfd29207c21 | 强化今夜明日本市大到暴雨的轨道交通防范工作(市领导指示版1).pdf | regulation | 4 |
| 6a8451191a8c6bfd29207c26 | 提升8月9日路网保驾等级.pdf | regulation | 1 |
| 6a84512b1a8c6bfd29207c28 | 关于做好2023年上海轨道交通防汛防台工作的通知.pdf | regulation | 11 |
| 6a84513a1a8c6bfd29207c34 | 关于做好汛期大范围运营调整或停运期间的指标统计及报送工作的相关事宜.docx | regulation | 4 |
| 6a8451431a8c6bfd29207c39 | 关于开展2023年上海轨道交通路网运营调度指挥中心汛前大检查活动的通知.pdf | regulation | 8 |
| 6a84514e1a8c6bfd29207c42 | 关于进一步加强2023年上海轨道交通路网运营调度指挥中心防汛防台工作的通知.pdf | regulation | 9 |
| 6a8451541a8c6bfd29207c4c | 防汛防台相关规章及处置要求.xls | regulation | 5 |
| 6a84515b1a8c6bfd29207c52 | 上海轨道交通路网调度指挥中心运营线路防汛防台调度现场处置方案.pdf | emergency_plan | 26 |
| 6a8451801a8c6bfd29207c6d | 上海轨道交通路网运营调度指挥中心异物侵限调度现场处置方案.pdf | emergency_plan | 16 |
| 6a8451911a8c6bfd29207c7e | 上海轨道交通路网运营调度指挥中心运营线路气象灾害调度现场处置方案.pdf | emergency_plan | 14 |
| 6a84519f1a8c6bfd29207c8d | 上海轨道交通路网运营调度指挥中心运营线路淹水倒灌调度现场处置方案.pdf | emergency_plan | 21 |
| 6a8451ac1a8c6bfd29207ca3 | 上海轨道交通路网运营调度指挥中心防汛防台管理规定.pdf | regulation | 24 |
| 6a8451ec1a8c6bfd29207cbc | 申通地铁集团异物侵限专项应急预案.pdf | emergency_plan | 13 |
| 6a8451f81a8c6bfd29207cca | 申通地铁集团运营线路气象灾害专项应急预案.pdf | emergency_plan | 14 |
| 6a8452071a8c6bfd29207cd9 | 申通地铁集团运营线路淹水倒灌专项应急预案.pdf | emergency_plan | 15 |
| 6a8452191a8c6bfd29207ce9 | 申通地铁集团运营线路防汛防台专项应急预案.pdf | emergency_plan | 29 |
| 6a84524b1a8c6bfd29207d07 | 申通地铁集团运营线路防汛防台管理规定.pdf | regulation | 31 |
| 6a8452661a8c6bfd29207d27 | 历年台风影响事件.docx | regulation | 9 |
| 6a8452771a8c6bfd29207d31 | 切实做好2022年第11号台风“轩岚诺”防御工作.doc | regulation | 10 |
| 6a8452851a8c6bfd29207d3c | 加强台风“轩岚诺”影响期间轨道交通线网运营保障工作.docx | regulation | 4 |
| 6a8452911a8c6bfd29207d41 | 9月14日上海地铁部分线路停运的预报.doc | regulation | 1 |
| 6a8452971a8c6bfd29207d43 | 9月15日上海地铁地面、高架区段首班车运营时间或将延至7时的预报.doc | regulation | 1 |
| 6a8452a31a8c6bfd29207d45 | 关于2022年第12号台风“梅花”防御工作情况的报告V2.docx | regulation | 7 |
| 6a8452aa1a8c6bfd29207d4d | 切实做好2022年第12号台风“梅花”防御工作.pdf | regulation | 9 |
| 6a8452b71a8c6bfd29207d57 | 台风事件汇总.docx | regulation | 3 |
| 6a8452c51a8c6bfd29207d5b | “梅花”速报(06).doc | regulation | 1 |
| 6a8452d31a8c6bfd29207d5d | “梅花”速报(07).doc | regulation | 1 |
| 6a8452e31a8c6bfd29207d5f | “梅花”速报(08）(2).doc | regulation | 1 |
| 6a8452ea1a8c6bfd29207d61 | “梅花”速报(09）.doc | regulation | 1 |
| 6a8452ee1a8c6bfd29207d63 | “梅花”速报(11）.doc | regulation | 1 |
| 6a8452f81a8c6bfd29207d65 | “梅花”速报(12）.doc | regulation | 1 |
| 6a8452fb1a8c6bfd29207d67 | “梅花”速报(14）.doc | regulation | 1 |
| 6a8453061a8c6bfd29207d69 | “梅花”速报(5).doc | regulation | 1 |
| 6a8453171a8c6bfd29207d6b | “梅花”速报（04）.doc | regulation | 1 |
| 6a8453261a8c6bfd29207d6d | 梅花.docx | regulation | 15 |
| 6a84533e1a8c6bfd29207d7d | 限速区段.docx | regulation | 1 |
| 6a8453461a8c6bfd29207d7f | 附件9近年主要影响台风汇总表（2018年至2022年）.docx | regulation | 4 |
| 6a8453501a8c6bfd29207d84 | 上海轨道交通路网运营调度指挥中心防汛防台专项应急预案.pdf | emergency_plan | 27 |
| 6a8453961a8c6bfd29207da0 | 调度指挥中心防御第12号台风“梅花”保障工作总结-运管部.docx | regulation | 15 |
| 6a8453aa1a8c6bfd29207db0 | 2013—2022年中国气象局热带气旋路径和强度预报误差.pdf | other | 57 |
| 6a8453d71a8c6bfd29207dea | 2021年台风季全球和区域模型中西北太平洋台风路径预报的评估.pdf | other | 118 |
| 6a8454281a8c6bfd29207e61 | 不同气动构型对传统列车侧风稳定性的影响.pdf | other | 84 |
| 6a84545e1a8c6bfd29207eb6 | 台风天气下地铁系统的客流量与人员流动：以中国福州为例.pdf | other | 94 |
| 6a8454a61a8c6bfd29207f15 | 台风天气下广州地铁线路停运及恢复时机探讨_张剑.pdf | other | 12 |
| 6a8454b11a8c6bfd29207f22 | 在高速铁路网络发生重大中断时重新安排列车时刻表，并预留座位.pdf | other | 179 |
| 6a84553a1a8c6bfd29207fd6 | 地面沉降情景下大都市区地铁系统的洪水风险评估：以北京为例.pdf | other | 145 |
| 6a8455ae1a8c6bfd29208068 | 基于不同风模型的高速列车侧风稳定性评估.pdf | other | 98 |
| 6a8455fc1a8c6bfd292080cb | 基于复杂系统视角，利用网格水动力模型和FBWMA方法分析地铁网络的淹没韧性：以武汉为例.pdf | other | 160 |
| 6a84569d1a8c6bfd2920816c | 基于弹性的应急母线桥接和调度优化模型，以应对地铁运营中断.pdf | other | 99 |
| 6a84571a1a8c6bfd292081d0 | 基于智能卡数据的洪水事件中地铁出行风险评估.pdf | other | 109 |
| 6a84579b1a8c6bfd2920823e | 基于类似台风路径的台风降雨预报改进.pdf | other | 96 |
| 6a8457e01a8c6bfd2920829f | 基于集合预报系统选择性共识的概率热带气旋路径预报方案.pdf | other | 101 |
| 6a84583e1a8c6bfd29208305 | 基于雷达回波的短期降雨预测：一种改进的自注意力PredRNN深度学习模型.pdf | other | 137 |
| 6a84589b1a8c6bfd2920838f | 我们是否已达到西北太平洋热带气旋路径可预测性的极限.pdf | other | 110 |
| 6a8458fa1a8c6bfd292083fe | 整合台风卫星影像特征和台风眼地理坐标的台风路径预测模型.pdf | other | 101 |
| 6a84593a1a8c6bfd29208464 | 未来海平面上升对交通基础设施造成的沿海洪水灾害损失估算.pdf | other | 114 |
| 6a8459831a8c6bfd292084d7 | 考虑侧风对列车影响的框架.pdf | other | 135 |
| 6a8459ff1a8c6bfd2920855f | 西北太平洋热带气旋路径预报技能的历史.pdf | other | 40 |
| 6a845a1c1a8c6bfd29208588 | 评估减少极端天气对基础设施网络影响的城市战略.pdf | other | 104 |
| 6a845ab81a8c6bfd292085f1 | 通过与公交服务的本地化整合增强地铁网络的弹性.pdf | other | 86 |
| 6a845b151a8c6bfd29208648 | 通过混合数值模式风信息改进雷达回波拉格朗日外推临近预报：16个台风案例的统计性能.pdf | other | 123 |
| 6a845b5e1a8c6bfd292086c4 | 通过聚集台风路径评估区域台风灾害管理风险.pdf | other | 82 |
| 6a845b951a8c6bfd29208717 | 铁路桥梁自适应玻璃钢风障结构的气动性能.pdf | other | 88 |
| 6a845bcd1a8c6bfd29208770 | 铁路桥梁风障对行驶列车的防护效果：一项实验研究.pdf | other | 136 |

## 说明

- fileType 统一为 `txt`：filePath 指向永久清洗文本，平台重处理走 parseText。
- autoTags / summary 未生成（平台依赖 llm_models 的 LLM 配置），可由平台 listDocumentsWithoutMetadata 接口补齐。
