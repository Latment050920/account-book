import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default function TransactionsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button>新增流水（占位）</Button>
      </div>
      <Card title="Phase 1 占位">
        <p className="text-sm text-slate-600">这里将在后续 Phase 实现按月筛选与流水列表。</p>
      </Card>
    </div>
  );
}
