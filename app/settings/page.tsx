import { Card } from "@/components/Card";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card title="Phase 1 占位">
        <p className="text-sm text-slate-600">这里将在后续 Phase 实现分类管理与预算设置。</p>
      </Card>
    </div>
  );
}
