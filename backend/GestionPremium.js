import express from "express";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Récupère l'ID utilisateur depuis "client_reference_id"
    const userId = session.client_reference_id;

    await supabase
      .from("profiles")
      .update({ is_premium: true })
      .eq("id", userId);
  }

  res.json({ received: true });
});

app.listen(3000, () => console.log("Webhook en écoute sur 3000"));
