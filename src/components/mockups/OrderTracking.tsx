import { useEffect, useState } from "react";
type Status = "ordered" | "packed" | "shipped" | "out_for_delivery" | "delivered";
const stepsMeta = [
  { id: "ordered", label: "Order Placed", desc: "Seller confirmed" },
  { id: "packed", label: "Packed", desc: "Verified by TrustLink" },
  { id: "shipped", label: "Shipped", desc: "Courier picked up" },
  { id: "out_for_delivery", label: "Out for Delivery", desc: "2.4km away" },
  { id: "delivered", label: "Delivered", desc: "Escrow release" },
] as const;
type Order = { id: string; status: Status; escrow: string; courier: { name: string; phone: string; distanceKm: number; etaMins: number } };
export default function OrderTracking() {
  const pathId = typeof window!== 'undefined'? window.location.pathname.split('/').pop() || 'TL-88421' : 'TL-88421';
  const cleanId = pathId === 'OrderTracking'? 'TL-88421' : pathId;
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>("shipped");
  const [released, setReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);
  useEffect(() => {
    fetch(`/api/orders/${cleanId}`).then(r=>r.json()).then(d=>{ setOrder(d); setStatus(d.status); setReleased(d.escrow==="released"); });
  }, [cleanId]);
  const idx = stepsMeta.findIndex(s=>s.id===status);
  const release = () => {
    setReleasing(true);
    fetch(`/api/orders/${cleanId}/release`, {method:'POST'}).then(()=>{ setReleased(true); setReleasing(false); });
  };
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-zinc-200">
        <div className="p-7 pb-3 flex items-center justify-between">
          <div><p className="text-xs tracking-widest font-semibold text-zinc-400 uppercase">Order #{order?.id || cleanId} - {released?"RELEASED":order?.escrow||"protected"}</p><h1 className="text-2xl font-bold tracking-tight mt-1">Track Order</h1></div>
          <div className={`w-12 h-12 rounded-2xl grid place-items-center text-xl font-bold ${released?"bg-green-600 text-white":"bg-zinc-900 text-white"}`}>{released?"✓":"P"}</div>
        </div>
        <div className="mx-5 mt-4 h-44 rounded-2xl bg-zinc-900 text-white p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="flex justify-between relative"><span className="text-xs bg-white/15 px-3 py-1 rounded-full">Live - {order?.courier.name}</span><span className="text-xs">{order?.courier.phone}</span></div>
          <div className="relative"><p className="text-sm opacity-70">{order?.courier.distanceKm}km away - ETA {order?.courier.etaMins}m</p><div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white" style={{width: `${((idx+1)/5)*100}%`}} /></div></div>
        </div>
        <div className="p-7 pt-6">
          {stepsMeta.map((s,i)=>{ const done=i<=idx; return <div key={s.id} className="flex gap-4"><div className="flex flex-col items-center"><div className={"w-9 h-9 rounded-full grid place-items-center text-sm font-bold border-2 "+(done?"bg-zinc-900 text-white border-zinc-900":"bg-white text-zinc-400 border-zinc-200")}>{done?"✓":i+1}</div>{i<stepsMeta.length-1 && <div className={"w-0.5 h-14 my-1.5 rounded-full "+(i<idx?"bg-zinc-900":"bg-zinc-200")} />}</div><div className="pb-8 -mt-0.5"><p className={"font-semibold "+(done?"text-zinc-900":"text-zinc-400")}>{s.label}</p><p className="text-sm text-zinc-500">{s.desc}</p></div></div> })}
        </div>
        {status==="delivered" && !released && (
          <div className="p-5 border-t bg-zinc-50">
            <button onClick={release} disabled={releasing} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition">
              {releasing ? "Releasing..." : "Release Escrow - R2,499"}
            </button>
            <p className="text-xs text-zinc-500 text-center mt-2">Funds go to seller after confirmation</p>
          </div>
        )}
        {released && <div className="p-5 border-t bg-green-50 text-green-700 text-center"><p className="font-bold">✓ Escrow Released to Seller</p><p className="text-xs mt-1">R2,499 transferred</p></div>}
        <div className="p-4 border-t flex gap-2 overflow-x-auto">{stepsMeta.map(s=><button key={s.id} onClick={()=>{ setStatus(s.id as Status); fetch(`/api/orders/${cleanId}/status`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:s.id}) }); }} className={"whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium border transition "+(status===s.id?"bg-zinc-900 text-white border-zinc-900":"bg-white text-zinc-600 border-zinc-200")}>{s.label}</button>)}</div>
      </div>
    </div>
  );
}
