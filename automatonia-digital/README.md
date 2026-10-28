# Automatonia Digital — Piloto de negócios online (3 × 2)

> Projecto independente do Build Calc e do website CONSTRUMOC. Não existem vendas automáticas nem receitas comprovadas nesta fase.

## Estado actual

- **Carteira:** três negócios digitais × dois canais de aquisição = seis experiências de marketing.
- **Gerador:** `business_factory.py` cria planos de campanha em Markdown, sem API externa.
- **Vitrine piloto:** `site/index.html` apresenta o projecto e as ofertas em validação.
- **Produto experimental:** `site/caixa.html` regista entradas e saídas em meticais, calcula o saldo, exporta CSV, cria backups JSON e permite restaurá-los.
- **Manual:** `site/guia-caixa.md` explica limitações e formas de utilização.
- **Testes:** verificação de ficheiros e sintaxe JavaScript no GitHub Actions.
- **Publicação:** ainda não foi colocado em produção nem existe checkout.

## Executar no teu computador (Windows)

É necessário Python 3.10+; o protótipo não requer API paga nem conta numa plataforma.

Abre o terminal na raiz do repositório:

```powershell
python -m http.server 8000 --directory automatonia-digital/site
```

Depois, no browser, abre:

```text
http://localhost:8000
```

Se o comando `python` não funcionar, experimenta o caminho da tua instalação do Python ou `py -m http.server 8000 --directory automatonia-digital/site`.

## Preparar seis campanhas

```powershell
python automatonia-digital/business_factory.py --validate
python automatonia-digital/business_factory.py
```

O segundo comando cria um plano de marketing em `automatonia-digital/drafts/`. Os rascunhos precisam de revisão; não são publicados.

## Segurança e limites

- O Gestor de Caixa é uma ferramenta local, **não** um serviço bancário ou de contabilidade certificado.
- Os dados são guardados em `localStorage` do navegador e podem desaparecer se limpares os dados ou mudares de dispositivo. Exporta backups regulares e guarda-os em local seguro.
- Não guarda cartões, PINs, palavras-passe ou dados em servidores. Não sincroniza entre utilizadores.
- Antes de cobrar, são necessários preços, política de reembolso, entrega, condições de utilização, protecção de dados e prestador de pagamentos compatível.
- Campanhas e ofertas de afiliados exigem revisão humana e identificação de eventuais comissões.
- Não enviar mensagens comerciais sem consentimento nem usar testemunhos, estatísticas ou resultados inventados.

## Automação segura

O workflow `.github/workflows/automatonia-business-ideas.yml` executa testes ao abrir um pull request. Para **gerar campanhas**, é necessário executá-lo manualmente (workflow_dispatch). Os planos são guardados como artefactos temporários privados do GitHub Actions. Não há envio automático de e-mails, publicação, despesas, cobranças ou criação de contas.

## Próximos passos reais para vender

1. Obter feedback de 10 potenciais clientes para o Gestor de Caixa e validar necessidades.
2. Corrigir problemas com testes de utilização e preparar um produto comercial mais completo.
3. Verificar prestadores de pagamentos e compatibilidade com levantamentos em Moçambique.
4. Implementar checkout com confirmação segura do pagamento no servidor e entrega digital.
5. Publicar conteúdo aprovado e medir visitas, demonstrações e conversões reais.
6. Expandir para eBooks, modelos e afiliados apenas depois dos primeiros testes.
