#!/usr/bin/env python3
"""Creates an unpublished ebook draft using the Gemini API. No external publishing or spending."""
import json, os, pathlib, datetime, urllib.request, urllib.error, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
key = os.environ.get("GEMINI_API_KEY", "")
if not key:
    sys.exit("GEMINI_API_KEY not configured. No content generated.")
topics = json.loads((ROOT / "topics.json").read_text(encoding="utf-8"))
if not topics:
    sys.exit("No topics configured.")
now = datetime.datetime.now(datetime.timezone.utc)
topic = topics[(now.toordinal() * 24 + now.hour) % len(topics)]
prompt = (
    "Escreve um rascunho ORIGINAL em português de Moçambique de um eBook educativo. "
    "Título: " + topic["title"] + ". Público: " + topic["audience"] + ". "
    "Produz introdução, 5 capítulos substanciais, exemplos práticos, conclusão e lista de "
    "referências A VERIFICAR. Não inventes citações, estatísticas, fontes ou normas. "
    "Não copies livros ou conteúdos protegidos. Explica limites, incertezas e pontos que "
    "requerem revisão humana. Começa com 'RASCUNHO — NÃO PUBLICADO'. "
    "Responde em Markdown puro."
)
model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"
payload = json.dumps({"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"temperature":0.65,"maxOutputTokens":8192}}).encode()
req = urllib.request.Request(url, data=payload, headers={"Content-Type":"application/json", "x-goog-api-key":key}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data=json.load(resp)
except urllib.error.HTTPError as e:
    raw = e.read(4096).decode("utf-8", errors="replace")
    try:
        details = json.loads(raw).get("error", {})
        message = str(details.get("message", "")).replace(key, "[REDACTED]")
        status = details.get("status", "UNKNOWN")
    except (ValueError, AttributeError):
        message, status = "Resposta inválida do fornecedor", "UNKNOWN"
    messages = {
        400: "Pedido recusado. Verificar modelo e parâmetros.",
        401: "Credencial não aceite pelo Gemini.",
        403: "Chave bloqueada, sem permissão ou serviço indisponível para a conta.",
        404: "Modelo não encontrado ou indisponível para esta API.",
        429: "Limite de quota ou de pedidos atingido. Não é possível gerar agora.",
        500: "Erro interno do fornecedor Gemini.",
        503: "Serviço de geração indisponível temporariamente.",
    }
    guidance = messages.get(e.code, "O fornecedor rejeitou o pedido.")
    print("ERRO GEMINI HTTP", e.code, "-", status)
    print("CAUSA:", guidance)
    print("DETALHE:", message[:500])
    sys.exit(1)
except (urllib.error.URLError, TimeoutError) as e:
    sys.exit("ERRO DE REDE: não foi possível comunicar com o Gemini.")

parts=data.get("candidates",[{}])[0].get("content",{}).get("parts",[])
content="\n".join(p.get("text","") for p in parts).strip()
if len(content)<1200:
    sys.exit("Draft too short or empty; nothing saved.")
folder=ROOT/"drafts"
folder.mkdir(exist_ok=True)
slug=re.sub(r"[^a-z0-9]+","-",topic["title"].lower()).strip("-")[:48]
path=folder/(now.strftime("%Y%m%d-%H%M%S")+"-"+slug+".md")
path.write_text(content+"\n\n---\nESTADO: AGUARDA REVISÃO HUMANA\n",encoding="utf-8")
print("Saved draft: "+path.name)
