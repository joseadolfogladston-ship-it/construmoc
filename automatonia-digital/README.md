# Automatonia — Negócios Digitais (piloto 3×2)

Módulo independente do website CONSTRUMOC e do Build Calc.

## Objectivo
Testar **3 modelos de negócio × 2 canais de aquisição**: eBooks e guias; modelos/planilhas; recomendações de afiliados transparentes. Os seis canais são experiências, não seis negócios já rentáveis.

## Execução sem custo de API de IA

Requer Python 3.10+ e não necessita de bibliotecas adicionais:

```bash
python automatonia-digital/business_factory.py --validate
python automatonia-digital/business_factory.py
```

O resultado é um ficheiro Markdown em `automatonia-digital/drafts/` com as seis campanhas propostas, público, oferta, validação, chamadas à acção e verificações de lançamento.

O workflow `automatonia-business-ideas.yml` é **manual**. Não executa anúncios, vendas, cobranças, e-mails, publicação em redes sociais nem criação de contas. Os rascunhos são guardados como artefactos temporários de GitHub Actions, não publicados no repositório.

## Próximas fases
1. **Validação:** conversar com potenciais compradores e recolher respostas autorizadas.
2. **Produto:** construir e testar uma oferta piloto antes de definir o preço.
3. **Loja:** escolher uma solução compatível com Moçambique, testar checkout, entrega e reembolso.
4. **Marketing:** ligar canais autorizados e preparar calendário editorial com aprovação humana.
5. **Métricas:** medir visitas, demonstrações, contactos consentidos, conversões reais e custos.
6. **Escala:** só investir em canais com resultados observados.

## Segurança e conformidade
- Nenhuma promessa de rendimento garantido; números de receita só depois de vendas verificadas.
- Sem conteúdo copiado, testemunhos inventados ou estatísticas fictícias.
- Sem automações de spam; newsletter apenas com consentimento.
- Links de afiliados e possíveis comissões sempre identificados.
- Despesas, publicações e pagamentos exigem aprovação explícita.
- Guardar tokens e segredos somente em gestores de segredos, nunca no código.

## Problema conhecido
O gerador antigo em `automatonia-autopublisher/` usa a API Gemini e pode falhar com HTTP 429 quando a quota está esgotada. Este novo módulo não depende desse serviço e não altera o pipeline antigo até à validação do piloto.
