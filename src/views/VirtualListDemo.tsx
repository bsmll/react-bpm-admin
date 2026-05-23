import React, { useMemo } from "react";
import { Card, Space, Alert, Row, Col, Statistic, Avatar } from "antd";
// 注意这里的路径，确保指向你刚改好的 VirtualList 组件
import { VirtualList } from "../components/VirtualList";
import "./VirtualListDemo.css";

interface ListItem {
  id: number;
  name: string;
  description: string;
  date: string;
}

const VirtualListDemo: React.FC = () => {
  // 1. 生成 10,000 条长短不一的模拟数据
  const dataList = useMemo(() => {
    const data: ListItem[] = [];
    const baseDescriptions = [
      "审批流程记录。",
      "任务处理日志。",
      "系统操作记录。",
      "用户活动追踪。",
    ];

    for (let i = 1; i <= 10000; i++) {
      // 故意制造长短不一的文本：随机将基础文本重复 1 到 8 次
      const repeatCount = Math.floor(Math.random() * 8) + 1;
      const baseText = baseDescriptions[i % baseDescriptions.length];
      const longDescription = new Array(repeatCount)
        .fill(baseText)
        .join(" 这是为了测试动态高度被故意拉长的文本。");

      data.push({
        id: i,
        name: `审批数据项 ${i}`,
        description: longDescription,
        date: new Date(Date.now() - i * 1000 * 60 * 60).toLocaleString("zh-CN"),
      });
    }
    return data;
  }, []);

  const getRandomColor = (index: number) => {
    const colors = [
      "#f56a00",
      "#7265e6",
      "#ffbf00",
      "#00a2ae",
      "#87d068",
      "#108ee9",
    ];
    return colors[index % colors.length];
  };

  const visibleCount = Math.ceil(500 / 60) + 10;

  return (
    <div className="virtual-list-demo">
      <Card title="动态高度虚拟列表演示" bordered={false}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Alert
            message="现在列表中的每一项高度都是不固定的（长文本会换行撑开高度）。请尝试滚动，观察滚动条是否平滑且不抖动！"
            type="success"
            showIcon
          />

          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="总数据量" value={dataList.length} />
            </Col>
            <Col span={12}>
              <Statistic title="内存中可见节点" value={visibleCount} />
            </Col>
          </Row>

          {/* 这里的 itemHeight 改为了 estimatedItemHeight */}
          <VirtualList
            list={dataList}
            estimatedItemHeight={60}
            containerHeight={500}
            overscan={5}
          >
            {(item, index) => (
              <div
                className="list-item"
                // 加点内边距，让排版更好看
                style={{ padding: "12px", borderBottom: "1px solid #f0f0f0" }}
              >
                <Space align="start">
                  <Avatar
                    style={{
                      backgroundColor: getRandomColor(index),
                      marginTop: "4px",
                    }}
                  >
                    {index + 1}
                  </Avatar>
                  <div style={{ width: "100%" }}>
                    <div style={{ fontWeight: 500, fontSize: "16px" }}>
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "rgba(0, 0, 0, 0.65)",
                        marginTop: "4px",
                        lineHeight: "1.5",
                      }}
                    >
                      {item.description}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#ccc",
                        marginTop: "4px",
                      }}
                    >
                      {item.date}
                    </div>
                  </div>
                </Space>
              </div>
            )}
          </VirtualList>
        </Space>
      </Card>
    </div>
  );
};

export default VirtualListDemo;
