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
# Consulta modelos autorizados para esta chave, sem assumir um modelo fixo.
headers = {"Content-Type": "application/json", "x-goog-api-key": key}
list_req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", headers=headers)
try:
    with urllib.request.urlopen(list_req, timeout=35) as resp:
        listing = json.load(resp)
except urllib.error.HTTPError as e:
    code = e.code
    e.read()
    sys.exit("Consulta de modelos falhou HTTP %s. Confirma permissões da chave e quota." % code)
except (urllib.error.URLError, TimeoutError):
    sys.exit("Erro de rede na consulta de modelos Gemini.")
available = [
    m["name"].split("/", 1)[1] for m in listing.get("models", [])
    if "generateContent" in m.get("supportedGenerationMethods", [])
    and m.get("name", "").startswith("models/")
    and "gemini" in m.get("name", "").lower()
]
if not available:
    sys.exit("A API não devolveu modelos compatíveis com generateContent.")
requested = os.environ.get("GEMINI_MODEL", "").strip()
ordered = []
if requested and requested in available:
    ordered.append(requested)
ordered += sorted(
    (m for m in available if m not in ordered),
    key=lambda m: (0 if "flash" in m and "preview" not in m else 1 if "flash" in m else 2,
                   0 if "2.5" in m else 1, m)
)
payload = json.dumps({
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"temperature": 0.65, "maxOutputTokens": 8192}
}).encode()
data = None
for model in ordered[:5]:
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.load(resp)
        print("Modelo utilizado:", model)
        break
    except urllib.error.HTTPError as e:
        code = e.code
        raw = e.read(4096).decode("utf-8", errors="replace")
        if code == 404:
            print("Modelo indisponível:", model, "- tentar outro modelo autorizado.")
            continue
        try:
            msg = json.loads(raw).get("error", {}).get("message", "")
            msg = str(msg).replace(key, "[REDACTED]")[:350]
        except (ValueError, AttributeError):
            msg = ""
        print("Erro Gemini HTTP", code, "no modelo", model)
        if msg:
            print("Detalhe:", msg)
        if code == 429:
            sys.exit("Quota insuficiente. Nenhum novo pedido será feito nesta execução.")
        sys.exit("Geração interrompida. Verificar credenciais, permissões ou parâmetros.")
    except (urllib.error.URLError, TimeoutError):
        sys.exit("Erro de rede durante a geração com Gemini.")
if data is None:
    sys.exit("Nenhum dos modelos anunciados pela API aceitou a geração (HTTP 404).")

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
