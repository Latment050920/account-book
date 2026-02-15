import { Card } from "@/components/Card";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Card title="Phase 1 占位">
        <p className="text-sm text-slate-600">这里将在后续 Phase 展示 KPI 与图表。</p>
      </Card>
    </div>
  );
}
