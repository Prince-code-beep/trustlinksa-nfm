import { Router } from "express";
const router = Router();
const mockOrders: Record<string, any> = {
  "TL-88421": {
    id: "TL-88421",
    status: "shipped",
    courier: { name: "Thabo", phone: "071 123 4567", distanceKm: 2.4, etaMins: 18 },
    items: [{ name: "Nike Air Max", price: 2499 }],
    escrow: "protected",
    escrowReleased: false,
  },
};
router.get("/:id", (req, res) => {
  const id = req.params.id;
  const order = mockOrders[id] || {...mockOrders["TL-88421"], id };
  res.json(order);
});
router.patch("/:id/status", (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!mockOrders[id]) mockOrders[id] = {...mockOrders["TL-88421"], id };
  mockOrders[id].status = status;
  if (status === "delivered") mockOrders[id].escrow = "ready_to_release";
  res.json({ ok: true, id, status: mockOrders[id].status });
});
router.post("/:id/release", (req, res) => {
  const id = req.params.id;
  if (!mockOrders[id]) return res.status(404).json({ error: "not found" });
  mockOrders[id].escrowReleased = true;
  mockOrders[id].escrow = "released";
  res.json({ ok: true, id, escrow: "released" });
});
router.get("/", (_req, res) => { res.json(Object.values(mockOrders)); });
export default router;
