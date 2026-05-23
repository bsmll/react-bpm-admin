import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Space, Button, Divider, Form, Input, Select, message } from "antd";
import { Graph } from "@antv/x6";
import { Selection } from "@antv/x6-plugin-selection";
import { Snapline } from "@antv/x6-plugin-snapline";
import { Keyboard } from "@antv/x6-plugin-keyboard";
import { Clipboard } from "@antv/x6-plugin-clipboard";
import { History } from "@antv/x6-plugin-history";
import { Transform } from "@antv/x6-plugin-transform";
import { nanoid } from "nanoid";
import { useProcessStore } from "../../stores/process";
import type { AiFormItemSchema } from "../../types";
import "./ProcessDesigner.css";

export interface ProcessDesignerHandle {
  /** 将 AI 表单写入当前选中的用户任务节点；成功返回 true */
  applyAiFormSchema: (schema: AiFormItemSchema[]) => boolean;
}

const { Option } = Select;

// 节点库配置
const PALETTE_NODES = [
  { type: "start", label: "开始", color: "#52c41a" },
  { type: "userTask", label: "用户任务", color: "#1677ff" },
  { type: "exclusiveGateway", label: "条件网关", color: "#faad14" },
  { type: "serviceTask", label: "服务任务", color: "#13c2c2" },
  { type: "end", label: "结束", color: "#ff4d4f" },
];

const ProcessDesigner = forwardRef<ProcessDesignerHandle>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const selectedNodeRef = useRef<any>(null);
  const syncToStoreRef = useRef<() => void>(() => {});
  const processStore = useProcessStore();
  const syncTimerRef = useRef<number | null>(null);
  const isReadyRef = useRef(false);
  const isUnmountedRef = useRef(false);

  // UI 状态
  const [selectedNode, setSelectedNode] = useState<any>(null);
  selectedNodeRef.current = selectedNode;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // --- 1. 初始化画布 ---
  useEffect(() => {
    if (!containerRef.current) return;
    isUnmountedRef.current = false;
    const graph = new Graph({
      container: containerRef.current,
      grid: {
        visible: true,
        size: 10,
        type: "dot",
        args: { color: "#d0d0d0", thickness: 1 },
      },
      panning: { enabled: true, modifiers: "ctrl" },
      mousewheel: {
        enabled: true,
        modifiers: "ctrl",
        factor: 1.1,
        maxScale: 2,
        minScale: 0.5,
      },
      connecting: {
        router: "manhattan",
        connector: { name: "rounded", args: { radius: 8 } },
        anchor: "center",
        connectionPoint: "anchor",
        allowBlank: false,
        snap: true,
        createEdge() {
          return graph.createEdge({
            attrs: {
              line: {
                stroke: "#A2B1C3",
                strokeWidth: 2,
                targetMarker: { name: "block", width: 12, height: 8 },
              },
            },
            zIndex: 0,
          });
        },
      },
    } as any);

    // 载入插件
    graph.use(
      new Selection({ enabled: true, multiple: true, rubberband: true }),
    );
    graph.use(new Snapline({ enabled: true }));
    graph.use(new Keyboard({ enabled: true }));
    graph.use(new Clipboard({ enabled: true }));
    graph.use(new History());
    graph.use(new Transform());

    graphRef.current = graph;

    // 事件监听
    setupEvents(graph);

    // 销毁
    return () => {
      isUnmountedRef.current = true;
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
      graph.dispose();
    };
  }, []);

  // --- 2. 监听 Store 数据并载入画布 ---
  useEffect(() => {
    const def = processStore.currentDefinition;
    if (def && graphRef.current) {
      loadDefinitionToGraph(def);
    }

    let timer = setTimeout(() => {
      isReadyRef.current = true;
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [processStore.currentDefinition?.id]);

  // --- 3. 核心业务方法 ---

  const setupEvents = (graph: Graph) => {
    // 监听所有变化并防抖同步到 Store
    const onUpdate = () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => syncToStore(), 500);
    };

    graph.on("node:change:position", onUpdate);
    graph.on("edge:connected", onUpdate);
    graph.on("node:added", onUpdate);
    graph.on("node:removed", onUpdate);
    graph.on("edge:removed", onUpdate);

    // 撤销重做状态
    graph.on("history:change", () => {
      const history = graph.getPlugin("history") as any;
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());
    });

    // 选中节点展示属性
    graph.on("node:click", ({ node }) => {
      setSelectedNode({
        id: node.id,
        name: node.attr("label/text") as string,
        ...node.getData(),
      });
    });

    graph.on("blank:click", () => setSelectedNode(null));
  };

  const loadDefinitionToGraph = (def: any) => {
    const graph = graphRef.current;
    if (!graph) return;

    isReadyRef.current = false;
    graph.clearCells();

    // 渲染节点
    def.nodes?.forEach((n: any) => {
      graph.addNode({
        id: n.id,
        x: n.x,
        y: n.y,
        width: 120,
        height: 60,
        label: n.name,
        data: { ...n, type: n.type },
        attrs: {
          body: {
            fill: getNodeColor(n.type),
            stroke: getNodeColor(n.type),
            rx: 6,
            ry: 6,
          },
          label: {
            fill: "#fff",
            fontSize: 12,
            text: n.name || n.label || "未命名节点",
          },
        },

        ports: {
          groups: {
            top: {
              position: "top",
              attrs: {
                circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
              },
            },
            bottom: {
              position: "bottom",
              attrs: {
                circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
              },
            },
            left: {
              position: "left",
              attrs: {
                circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
              },
            },
            right: {
              position: "right",
              attrs: {
                circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
              },
            },
          },
          items: [
            { group: "top" },
            { group: "bottom" },
            { group: "left" },
            { group: "right" },
          ],
        },
      });
    });

    // 渲染连线
    def.edges?.forEach((e: any) => {
      graph.addEdge({
        id: e.id,
        source: e.source,
        target: e.target,
        labels: e.label ? [{ text: e.label }] : [],
      });
    });
  };

  const syncToStore = () => {
    const graph = graphRef.current;
    const def = processStore.currentDefinition;
    if (!graph || !def || !isReadyRef.current) {
      console.log("同步被拦截：画布尚未准备好");
      return;
    }

    const nodes = graph.getNodes().map((n) => {
      // 💡 获取当前节点的数据快照
      const cellData = n.getData() || {};

      const currentName = n.attr("label/text") as string;
      let nodeType = cellData.type;
      if (!nodeType) {
        const fill = n.attr("body/fill");
        if (fill === "#52c41a") nodeType = "start";
        else if (fill === "#ff4d4f") nodeType = "end";
        else if (fill === "#13c2c2")
          nodeType = "serviceTask"; // 💡 补上服务任务的颜色判定
        else nodeType = "userTask";
      }
      return {
        id: n.id,
        x: n.position().x,
        y: n.position().y,
        // 💡 关键：名字必须从 attrs 里拿
        name: currentName,
        type: nodeType,
        ...cellData,
      };
    });

    const edges = graph.getEdges().map((e) => ({
      id: e.id,
      source: e.getSourceCellId()!,
      target: e.getTargetCellId()!,
      label: (e.getLabels()[0]?.text as string) || "",
    }));

    processStore.updateNodesAndEdges(def.id, nodes, edges);
  };

  syncToStoreRef.current = syncToStore;

  useImperativeHandle(ref, () => ({
    applyAiFormSchema(schema: AiFormItemSchema[]) {
      const graph = graphRef.current;
      const sn = selectedNodeRef.current;
      if (!graph || !sn) {
        message.warning("请先在画布上选中一个节点");
        return false;
      }
      if (sn.type !== "userTask") {
        message.warning('请先选中「用户任务」节点后再关联表单');
        return false;
      }
      const cell = graph.getCellById(sn.id);
      if (!cell || !cell.isNode()) {
        message.warning("节点不存在或已被删除");
        return false;
      }
      const node = cell as any;
      node.setData({ ...node.getData(), formSchema: schema });
      setSelectedNode({ ...sn, formSchema: schema });
      syncToStoreRef.current();
      message.success(`已将 ${schema.length} 个字段写入当前用户任务`);
      return true;
    },
  }));

  const getNodeColor = (type: string) => {
    const colors: any = {
      start: "#52c41a",
      end: "#ff4d4f",
      exclusiveGateway: "#faad14",
      userTask: "#1677ff",
      serviceTask: "#13c2c2",
    };
    return colors[type] || "#1677ff";
  };

  // --- 4. 拖拽逻辑 ---
  const handleDrop = (e: React.DragEvent) => {
    const graph = graphRef.current;
    if (!graph || !containerRef.current) return;

    const nodeInfo = JSON.parse(e.dataTransfer.getData("nodeType"));
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const y = e.clientY - rect.top - 30;

    graph.addNode({
      id: nanoid(),
      x,
      y,
      width: 120,
      height: 60,
      label: nodeInfo.label,
      data: { type: nodeInfo.type, name: nodeInfo.label },
      attrs: {
        body: { fill: nodeInfo.color, stroke: nodeInfo.color, rx: 6, ry: 6 },
        label: { fill: "#fff" },
      },
      // 默认加上四个连接桩
      ports: {
        groups: {
          top: {
            position: "top",
            attrs: {
              circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
            },
          },
          bottom: {
            position: "bottom",
            attrs: {
              circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
            },
          },
          left: {
            position: "left",
            attrs: {
              circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
            },
          },
          right: {
            position: "right",
            attrs: {
              circle: { r: 3, magnet: true, fill: "#fff", stroke: "#31d05e" },
            },
          },
        },
        items: [
          { group: "top" },
          { group: "bottom" },
          { group: "left" },
          { group: "right" },
        ],
      },
    });
  };

  const updateNodeProperty = (key: string, value: any) => {
    const graph = graphRef.current;
    if (!graph || !selectedNode) return;
    const node = graph.getCellById(selectedNode.id);
    if (node) {
      if (key === "name") {
        node.attr("label/text", value);
      } else {
        node.setData({ ...node.getData(), [key]: value });
      }
      setSelectedNode({ ...selectedNode, [key]: value });
      syncToStore();
    }
  };

  return (
    <div className="designer-wrapper">
      {/* 顶部工具栏 */}
      <div className="designer-toolbar">
        <Space>
          <Button onClick={() => graphRef.current?.undo()} disabled={!canUndo}>
            撤销
          </Button>
          <Button onClick={() => graphRef.current?.redo()} disabled={!canRedo}>
            重做
          </Button>
          <Divider type="vertical" />
          <Button
            danger
            onClick={() => {
              const cells = graphRef.current?.getSelectedCells();
              if (cells?.length) graphRef.current?.removeCells(cells);
            }}
          >
            删除选中
          </Button>
        </Space>
      </div>

      <div className="designer-main">
        {/* 左侧库 */}
        <div className="node-palette">
          {PALETTE_NODES.map((n) => (
            <div
              key={n.type}
              className="palette-item"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("nodeType", JSON.stringify(n))
              }
              style={{ backgroundColor: n.color }}
            >
              {n.label}
            </div>
          ))}
        </div>

        {/* 画布容器 */}
        <div
          ref={containerRef}
          className="canvas-container"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        />

        {/* 右侧属性栏 */}
        <div className="property-panel">
          {selectedNode ? (
            <Form layout="vertical" size="small">
              <h3>节点设置</h3>
              <Form.Item label="节点名称">
                <Input
                  value={selectedNode.name}
                  onChange={(e) => updateNodeProperty("name", e.target.value)}
                />
              </Form.Item>
              {selectedNode.type === "userTask" && (
                <>
                  <Form.Item label="审批人">
                    <Select
                      value={selectedNode.assignee}
                      onChange={(v) => updateNodeProperty("assignee", v)}
                    >
                      <Option value="admin">管理员</Option>
                      <Option value="manager">部门经理</Option>
                    </Select>
                  </Form.Item>
                  {Array.isArray(selectedNode.formSchema) &&
                    selectedNode.formSchema.length > 0 && (
                      <Form.Item label="动态表单">
                        <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
                          已配置 {selectedNode.formSchema.length} 个字段（AI
                          生成）
                        </span>
                      </Form.Item>
                    )}
                </>
              )}
            </Form>
          ) : (
            <div className="empty-tip">点击节点进行配置</div>
          )}
        </div>
      </div>
    </div>
  );
});

ProcessDesigner.displayName = "ProcessDesigner";

export default ProcessDesigner;
