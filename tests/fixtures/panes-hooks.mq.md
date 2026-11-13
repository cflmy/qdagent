## fixture_panes_next

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 直接入口状态成立后推进验收 |

从显式输入表取下一组指针观测；只向正式事件入口提供坐标和固定分隔条身份。前六组覆盖左右正常移动、最大边界与最小边界。最后重置内存基准再读取真实localStorage，模拟刷新恢复，不替正式恢复回调写期望值。

This is an explicit deterministic acceptance hook. It supplies event metadata or observes saved direct-entry state, never implements the product's dimension calculation. The official WASM executes the unchanged production handler on a later timer turn. A passing state marker is insufficient: the separate runner also examines the final DOM, numeric CSS variables, source visibility and preserved trace expansion. The dedicated file page uses no user identity, provider credential or external model.

We **fixture_step = `fixture_step` + 1**.
1. `fixture_step` > 6
  We **layout_sidebar = 267** and **layout_inspector = 496**.
  Return *browser.store_get(key="qdagent.panes.v3",scope="local",then="restore_layout")*.
We **sample = access(`fixture_steps`,`fixture_step`)**.
We **fixture_id = access(`sample`,"id")** and **fixture_anchor = access(`sample`,"anchor")** and **fixture_target = access(`sample`,"target")**.
Return *browser.after(ms=10,then="begin_resize")*.

## fixture_panes_observe

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 直接入口状态成立后推进验收 |

实际拖拽结束以后比较两侧保存值与该组预期，并要求活动拖拽已经清空。这里不修复错误尺寸；任何一项不匹配就留下明确失败标记。只有所有真实入口成功才推进下一个输入。

This is an explicit deterministic acceptance hook. It supplies event metadata or observes saved direct-entry state, never implements the product's dimension calculation. The official WASM executes the unchanged production handler on a later timer turn. A passing state marker is insufficient: the separate runner also examines the final DOM, numeric CSS variables, source visibility and preserved trace expansion. The dedicated file page uses no user identity, provider credential or external model.

We **sample = access(`fixture_steps`,`fixture_step`)**.
1. `layout_sidebar` != access(`sample`,"left") or `layout_inspector` != access(`sample`,"right") or `drag_region` != ""
  Return *browser.set_text(sel="#probe",text=("panes-ui-fail:step-" + str(`fixture_step`)))*.
Return *browser.after(ms=10,then="fixture_panes_next")*.

## fixture_panes_restored

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 直接入口状态成立后推进验收 |

正式存储读取和恢复回调必须把先前最后一组220/320恢复回来。随后以键盘向左移动右边界，预期它增加16像素。测试不直接分配键盘计算结果，下一步仍由生产回调保存。

This is an explicit deterministic acceptance hook. It supplies event metadata or observes saved direct-entry state, never implements the product's dimension calculation. The official WASM executes the unchanged production handler on a later timer turn. A passing state marker is insufficient: the separate runner also examines the final DOM, numeric CSS variables, source visibility and preserved trace expansion. The dedicated file page uses no user identity, provider credential or external model.

1. `layout_sidebar` != 220 or `layout_inspector` != 320
  Return *browser.set_text(sel="#probe",text="panes-ui-fail:restore")*.
We **fixture_id = "resize-inspector"** and **fixture_key = "ArrowLeft"**.
Return *browser.after(ms=10,then="resize_keyboard")*.

## fixture_panes_key_done

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 直接入口状态成立后推进验收 |

键盘方向与右侧面板宽度相反，左移边界应得到336而不是304。验证后调用真正的双击恢复入口；测试本身不把两侧改回设计值。正常执行卡片的展开也必须一直保留。

This is an explicit deterministic acceptance hook. It supplies event metadata or observes saved direct-entry state, never implements the product's dimension calculation. The official WASM executes the unchanged production handler on a later timer turn. A passing state marker is insufficient: the separate runner also examines the final DOM, numeric CSS variables, source visibility and preserved trace expansion. The dedicated file page uses no user identity, provider credential or external model.

1. `layout_sidebar` != 220 or `layout_inspector` != 336
  Return *browser.set_text(sel="#probe",text="panes-ui-fail:keyboard")*.
Return *browser.after(ms=10,then="reset_layout")*.

## fixture_panes_reset_done

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 直接入口状态成立后推进验收 |

两侧需要实际恢复267/496并结束拖拽，接着进入真实源码切换入口。源码在前面的正式预览响应中获得，不能在此注入期望文本或造一个看似打开的源码区域。

This is an explicit deterministic acceptance hook. It supplies event metadata or observes saved direct-entry state, never implements the product's dimension calculation. The official WASM executes the unchanged production handler on a later timer turn. A passing state marker is insufficient: the separate runner also examines the final DOM, numeric CSS variables, source visibility and preserved trace expansion. The dedicated file page uses no user identity, provider credential or external model.

1. `layout_sidebar` != 267 or `layout_inspector` != 496 or `drag_region` != ""
  Return *browser.set_text(sel="#probe",text="panes-ui-fail:reset")*.
Return *browser.after(ms=10,then="toggle_preview_source")*.

## fixture_panes_finish

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 直接入口状态成立后推进验收 |

终态必须仍有已接受的源稿，并保留先前任务详情。通过标记之后，运行器独立检查真正的节点和样式，不把观察器结束等同于界面已更新。

This is an explicit deterministic acceptance hook. It supplies event metadata or observes saved direct-entry state, never implements the product's dimension calculation. The official WASM executes the unchanged production handler on a later timer turn. A passing state marker is insufficient: the separate runner also examines the final DOM, numeric CSS variables, source visibility and preserved trace expansion. The dedicated file page uses no user identity, provider credential or external model.

1. `preview_source` == "" or `trace_open` != "|1|"
  Return *browser.set_text(sel="#probe",text="panes-ui-fail:source-or-trace")*.
Return *browser.set_text(sel="#probe",text="panes-ui-pass")*.
