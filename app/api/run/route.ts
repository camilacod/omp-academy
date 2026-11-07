import { NextResponse } from "next/server";
import { runCode } from "@/lib/runner";

export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { code?: string; threads?: number; stdin?: string; args?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const code = body.code ?? "";
  if (!code.trim() || code.length > 30000) {
    return NextResponse.json({ error: "Código vacío o demasiado largo (máx. 30 000 caracteres)" }, { status: 400 });
  }
  try {
    const res = await runCode({
      code,
      threads: body.threads,
      stdin: (body.stdin ?? "").slice(0, 20000),
      args: (body.args ?? []).slice(0, 8).map(String),
    });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { error: "No se pudo contactar con los compiladores remotos. Inténtalo de nuevo en unos segundos.", detail: String(e) },
      { status: 502 },
    );
  }
}
