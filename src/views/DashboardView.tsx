import React, { useMemo, useEffect } from "react";
import { Row, Col, Card, Statistic, Timeline, message } from "antd";
import { useInstanceStore } from "../stores/instance";
import { useProcessStore } from "../stores/process";
import "./Dashboard.css";

const DashboardView: React.FC = () => {
  const { instances, fetchInstances } = useInstanceStore();
  const { definitions, fetchDefinitions } = useProcessStore();

  // 1. 对应 Vue 的 onMounted
  useEffect(() => {
    const loadData = async () => {
      try {
        // 同时发起两个请求
        await Promise.all([fetchInstances(), fetchDefinitions()]);
      } catch (error: any) {
        message.error(error.message || "加载数据失败");
      }
    };
    loadData();
  }, [fetchInstances, fetchDefinitions]);

  // 2. 对应 Vue 的 statistics computed
  const statistics = useMemo(() => {
    const totalInstances = instances.length;
    const runningInstances = instances.filter(
      (i) => i.status === "running",
    ).length;
    const completedInstances = instances.filter(
      (i) => i.status === "completed",
    ).length;
    const approvalRate =
      totalInstances > 0 ? (completedInstances / totalInstances) * 100 : 0;

    return {
      totalInstances,
      runningInstances,
      completedInstances,
      approvalRate,
    };
  }, [instances]);

  // 3. 对应 Vue 的 funnelData computed
  const funnelData = useMemo(() => {
    const total = instances.length;
    if (total === 0) return [];

    return [
      { label: "提交申请", value: total, percentage: 100 },
      {
        label: "审批中",
        value: instances.filter((i) => i.status === "running").length,
        percentage:
          (instances.filter((i) => i.status === "running").length / total) *
          100,
      },
      {
        label: "已完成",
        value: instances.filter((i) => i.status === "completed").length,
        percentage:
          (instances.filter((i) => i.status === "completed").length / total) *
          100,
      },
    ];
  }, [instances]);

  // 4. 对应 Vue 的 processDistribution computed
  const processDistribution = useMemo(() => {
    const distribution = new Map<string, number>();

    instances.forEach((instance) => {
      const definition = definitions.find(
        (d) => d.id === instance.definitionId,
      );
      const name = definition?.name || instance.definitionId;
      distribution.set(name, (distribution.get(name) || 0) + 1);
    });

    const total = instances.length;

    return Array.from(distribution.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [instances, definitions]);

  // 5. 对应 Vue 的 recentActivities computed
  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    instances.forEach((instance) => {
      instance.history.forEach((history) => {
        activities.push({
          id: `${instance.id}-${history.id}`,
          title: history.nodeName,
          type: history.type,
          timestamp: history.timestamp,
          operator: history.operator,
        });
      });
    });
    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [instances]);

  // 辅助函数
  const getActivityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      enter: "blue",
      leave: "gray",
      complete: "green",
    };
    return colorMap[type] || "gray";
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString("zh-CN");

  return (
    <div className="dashboard-container">
      {/* 第一行：统计卡片 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="总申请数"
              value={statistics.totalInstances}
              styles={{ content: { color: "#3f8600" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="审批中"
              value={statistics.runningInstances}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="已完成"
              value={statistics.completedInstances}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="通过率"
              value={statistics.approvalRate}
              suffix="%"
              precision={2}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行：图表展示 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="审批转化漏斗" bordered={false}>
            <div className="funnel-chart">
              {funnelData.map((item) => (
                <div
                  key={item.label}
                  className="funnel-item"
                  style={{ width: `${item.percentage}%` }}
                >
                  <span className="funnel-label">{item.label}</span>
                  <span className="funnel-value">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="流程分布" bordered={false}>
            <div className="process-chart">
              {processDistribution.map((item) => (
                <div key={item.name} className="process-item">
                  <div className="process-label">{item.name}</div>
                  <div className="process-bar">
                    <div
                      className="process-bar-fill"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="process-value">{item.count}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 第三行：时间轴 */}
      <Row gutter={24}>
        <Col span={24}>
          <Card title="最近活动" bordered={false}>
            <Timeline>
              {recentActivities.map((activity) => (
                <Timeline.Item
                  key={activity.id}
                  color={getActivityColor(activity.type)}
                >
                  <div style={{ fontWeight: 500 }}>{activity.title}</div>
                  <div style={{ color: "#999", fontSize: 12 }}>
                    {formatDate(activity.timestamp)}
                  </div>
                  {activity.operator && (
                    <div style={{ color: "#666", fontSize: 12 }}>
                      操作人：{activity.operator}
                    </div>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardView;
