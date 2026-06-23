// app/api/status/route.ts
// Опрос статуса асинхронной генерации (GenAPI/Suno).
// Клиент дёргает этот роут раз в несколько секунд, пока не придёт audioUrl.

import { NextRequest, NextResponse } from "next/server";
import { pollGenApi } from "@/lib/musicgen";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }
  try {
    const r = await pollGenApi(id);
    return NextResponse.json(r);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Ошибка опроса";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
