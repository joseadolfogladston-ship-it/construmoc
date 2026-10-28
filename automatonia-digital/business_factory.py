#!/usr/bin/env python3
"""Automatonia: produz planos de campanhas para revisão; não publica nem cobra."""
import argparse
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def generate(catalog, date):
    negocios = catalog["businesses"]
    assert len(negocios) == 3, "O piloto requer três negócios"
    assert all(len(b["channels"]) == 2 for b in negocios), "Cada negócio requer dois canais"
    lines = [
        "# Automatonia — plano de negócios digitais",
        "",
        f"**Data:** {date}",
        "**Estado:** RASCUNHO / AGUARDA REVISÃO HUMANA",
        "**Âmbito:** três negócios × dois canais = seis experiências.",
        "",
        "| Negócio | Canal | Indicador |",
        "|---|---|---|"
    ]
    for b in negocios:
        for c in b["channels"]:
            lines.append(f"| {b['name']} | {c['name']} | {c['metric']} |")
    for b in negocios:
        lines.extend([
            "", f"## {b['name']}", "",
            f"**Público:** {b['audience']}",
            f"**Oferta piloto:** {b['offer']}",
            f"**Validação antes de vender:** {b['validation']}",
            ""
        ])
        for c in b["channels"]:
            lines.extend([
                f"### Canal: {c['name']}", "",
                f"**Ideia de conteúdo:** {c['hook']}",
                f"**Chamada à acção:** {c['cta']}",
                f"**Métrica:** {c['metric']}",
                "**Estado:** ainda não publicado.", ""
            ])
    lines.extend([
        "## Checklist antes de lançar", "",
        "- [ ] Confirmar procura com pessoas reais.",
        "- [ ] Produzir e rever produto original ou comparação verificável.",
        "- [ ] Validar preço, forma de entrega, suporte e reembolsos.",
        "- [ ] Confirmar meios de pagamento realmente disponíveis em Moçambique.",
        "- [ ] Confirmar direitos de autor, privacidade e termos das plataformas.",
        "- [ ] Obter consentimento para mensagens comerciais; proibir spam.",
        "- [ ] Divulgar claramente comissões de afiliados.",
        "- [ ] Aprovar manualmente qualquer publicação ou despesa.",
        "",
        "Nota: campanhas, procura, receitas e cliques são hipóteses de teste,",
        "não resultados já observados. Não há publicação ou pagamento automático.", ""
    ])
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate", action="store_true")
    parser.add_argument("--date", default=dt.datetime.now(dt.timezone.utc).date().isoformat())
    parser.add_argument("--out", type=Path, default=ROOT / "drafts")
    args = parser.parse_args()
    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
    content = generate(catalog, dt.date.fromisoformat(args.date).isoformat())
    if args.validate:
        print("OK: carteira 3x2 validada; sem dependências externas")
        return
    args.out.mkdir(parents=True, exist_ok=True)
    path = args.out / ("automatonia-plano-" + args.date + ".md")
    path.write_text(content, encoding="utf-8")
    print("Plano criado:", path)

if __name__ == "__main__":
    main()
