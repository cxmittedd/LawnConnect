import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type C = { id: string; name: string; parish: string; image_url: string | null; active: boolean; sort_order: number };
type P = { id: string; title: string; body: string | null; cta_label: string | null; cta_link: string | null; active: boolean };

const AdminHomepage = () => {
  const [cs, setCs] = useState<C[]>([]);
  const [ps, setPs] = useState<P[]>([]);
  const [nc, setNc] = useState({ name: "", parish: "", image_url: "" });
  const [np, setNp] = useState({ title: "", body: "", cta_label: "", cta_link: "" });

  const load = async () => {
    const [a, b] = await Promise.all([
      supabase.from("homepage_communities").select("*").order("sort_order"),
      supabase.from("homepage_promos").select("*").order("created_at", { ascending: false }),
    ]);
    setCs(a.data || []);
    setPs(b.data || []);
  };
  useEffect(() => { load(); }, []);

  const done = (error: unknown) => { if (error) toast.error("Couldn't save"); else { toast.success("Saved"); load(); } };

  const addC = async () => {
    if (!nc.name.trim()) return;
    const { error } = await supabase.from("homepage_communities").insert({
      name: nc.name.trim(), parish: nc.parish.trim() || "Jamaica", image_url: nc.image_url.trim() || null, sort_order: cs.length + 1,
    });
    setNc({ name: "", parish: "", image_url: "" });
    done(error);
  };
  const addP = async () => {
    if (!np.title.trim()) return;
    const { error } = await supabase.from("homepage_promos").insert({
      title: np.title.trim(), body: np.body.trim() || null, cta_label: np.cta_label.trim() || null, cta_link: np.cta_link.trim() || null,
    });
    setNp({ title: "", body: "", cta_label: "", cta_link: "" });
    done(error);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-3xl space-y-8 px-4 py-8">
        <h1 className="text-3xl font-extrabold">Homepage</h1>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Community cards</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cs.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex-1"><p className="font-semibold">{c.name}</p><p className="text-sm text-muted-foreground">{c.parish}</p></div>
                <Switch checked={c.active} onCheckedChange={async (v) => done((await supabase.from("homepage_communities").update({ active: v }).eq("id", c.id)).error)} />
                <Button variant="ghost" size="icon" onClick={async () => done((await supabase.from("homepage_communities").delete().eq("id", c.id)).error)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder="Community name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
              <Input placeholder="Parish" value={nc.parish} onChange={(e) => setNc({ ...nc, parish: e.target.value })} />
              <Input placeholder="Photo link (optional)" value={nc.image_url} onChange={(e) => setNc({ ...nc, image_url: e.target.value })} />
            </div>
            <Button onClick={addC}>Add community</Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Promotions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ps.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex-1"><p className="font-semibold">{p.title}</p><p className="text-sm text-muted-foreground">{p.body}</p></div>
                <Switch checked={p.active} onCheckedChange={async (v) => done((await supabase.from("homepage_promos").update({ active: v }).eq("id", p.id)).error)} />
                <Button variant="ghost" size="icon" onClick={async () => done((await supabase.from("homepage_promos").delete().eq("id", p.id)).error)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Input placeholder="Title" value={np.title} onChange={(e) => setNp({ ...np, title: e.target.value })} />
            <Input placeholder="Description" value={np.body} onChange={(e) => setNp({ ...np, body: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Button text (optional)" value={np.cta_label} onChange={(e) => setNp({ ...np, cta_label: e.target.value })} />
              <Input placeholder="Button link, e.g. /post-job" value={np.cta_link} onChange={(e) => setNp({ ...np, cta_link: e.target.value })} />
            </div>
            <Button onClick={addP}>Add promotion</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminHomepage;
