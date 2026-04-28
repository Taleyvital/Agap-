import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const service  = createSupabaseServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json() as { item_id?: string };
  const itemId = body.item_id;
  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  // Fetch item
  const { data: item } = await service
    .from("avatar_shop_items")
    .select("item_id, price_coins")
    .eq("item_id", itemId)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // Check already purchased
  const { data: existing } = await service
    .from("user_purchased_items")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "Already purchased" }, { status: 409 });

  // Fetch current balance
  const { data: wallet } = await service
    .from("user_coins")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();
  const balance = wallet?.balance ?? 0;

  if (balance < item.price_coins) {
    return NextResponse.json({ error: "Insufficient coins" }, { status: 402 });
  }

  // Deduct coins (negative increment)
  const { error: rpcErr } = await service.rpc("increment_coins", {
    p_user_id: user.id,
    p_amount: -item.price_coins,
  });
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

  // Record purchase
  const { error: insertErr } = await service
    .from("user_purchased_items")
    .insert({ user_id: user.id, item_id: itemId });
  if (insertErr) {
    // Rollback: refund coins
    await service.rpc("increment_coins", { p_user_id: user.id, p_amount: item.price_coins });
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const new_balance = balance - item.price_coins;
  return NextResponse.json({ success: true, new_balance });
}
