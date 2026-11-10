import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, PressableCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Design system check for replica-design. Not a real screen — a page to
// screenshot and to build the next screen's components against, per the
// skill's step 4: "build the components in code once, in isolation... before
// any screen."
export default function DesignPage() {
  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-10">
      <header>
        <h1 className="text-xl font-bold text-ink">Design system check</h1>
        <p className="text-sm text-muted">
          Tokens from replica/design/tokens.json. No screenshots exist for the original app
          (see tokens.json for why) — this is a reasoned placeholder system, not a trace.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="primary" loading>
            Saving
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small (44px)</Button>
          <Button size="md">Medium (48px)</Button>
          <Button size="lg">Large (56px)</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 max-w-sm">
        <h2 className="text-lg font-semibold text-ink">Input</h2>
        <Input label="Customer name" placeholder="e.g. Ramesh Kirana Store" />
        <Input label="Amount" numeric placeholder="0" />
        <Input label="Amount" numeric defaultValue="abc" error="Enter a number" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Badge (balance pill)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="inflow">you&apos;ll get ₹240</Badge>
          <Badge variant="outflow">you&apos;ll give ₹85</Badge>
          <Badge variant="low-stock">low stock</Badge>
          <Badge variant="out-of-stock">out of stock</Badge>
          <Badge variant="neutral">settled</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Card / Customer row</h2>
        <Card>
          <p className="text-sm text-muted">Plain card</p>
        </Card>
        <PressableCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">Ramesh Kirana Store</p>
              <p className="text-sm text-muted">Last entry: yesterday</p>
            </div>
            <Badge variant="inflow">you&apos;ll get ₹240</Badge>
          </div>
        </PressableCard>
        <PressableCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">Suresh Medical</p>
              <p className="text-sm text-muted">Last entry: 3 days ago</p>
            </div>
            <Badge variant="outflow">you&apos;ll give ₹85</Badge>
          </div>
        </PressableCard>
      </section>

      <section className="flex flex-col gap-3 max-w-sm">
        <h2 className="text-lg font-semibold text-ink">Hindi + English (Hind font)</h2>
        <Card>
          <p className="text-lg text-ink">आपको मिलना है ₹240</p>
          <p className="text-sm text-muted">कल की आखिरी एंट्री</p>
        </Card>
      </section>
    </main>
  );
}
