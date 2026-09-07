# Spine Check

Validador local de entregas [Spine](https://esotericsoftware.com/) para jogos PixiJS v8 +
`@esotericsoftware/spine-pixi-v8` 4.2. Arraste a pasta da entrega (`.json`/`.skel`, `.atlas`, texturas,
subpastas `@0.5x/`), veja os findings, confira no preview com o runtime real e exporte um relatório
Markdown/JSON para o time de arte. Tudo roda no browser; nada sai do seu computador.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (core + runtime puro)
npm run typecheck
npm run build      # produção em dist/
```

## Entrada

- Pasta inteira (recursiva) ou arquivos soltos: `.json` ou `.skel`, `.atlas`, `.png`/`.webp`/`.jpg`.
- Skeleton, atlas e imagens são agrupados pelo nome base; as imagens vêm dos nomes de página do `.atlas`.
- Subpastas chamadas `@0.5x`, `@2x` etc. viram variantes de resolução do bundle da pasta pai.
- "Carregar exemplo" carrega um bundle sintético com defeitos de propósito.

## O que ele checa

Findings têm código estável, severidade (erro / aviso / info), mensagem e dica de correção.

| Grupo | Exemplos |
|---|---|
| Arquivos | atlas ou skeleton faltando, imagem de página ausente ou com caixa diferente, textura solta, `.json` + `.skel` juntos, nomes com espaço/maiúscula |
| Skeleton | versão do Spine vs runtime alvo, attachment apontando para região inexistente no atlas (o runtime lança), animações vazias, nomes de sobra (`backup/`, `old`, `tmp`…), bones/slots/skins sem uso, eventos nunca disparados, clipping, meshes pesadas, deform, constraints, blend modes, dados não essenciais, JSON indentado |
| Atlas | `size` diferente da imagem real, região fora da página, páginas grandes demais, regiões duplicadas ou sem uso, ocupação baixa, formato/tamanho das texturas, memória de GPU estimada |
| Variantes | skeleton da variante diferente do raiz, `scale` ausente ou diferente da pasta, páginas com tamanho inesperado, imagem faltando |
| Runtime | falha de carga com a mensagem exata do spine-pixi-v8, NaN em transforms, loop seamless e bounds por animação, eventos disparados |

Thresholds (tamanho de página, memória, vértices, padrões de nome…) ficam na engrenagem e persistem no
`localStorage`.

## Preview

Runtime real (`spine-pixi-v8`): animação, skin, loop, velocidade, scrub, variante raiz/`@0.5x`, fundo
escuro/claro/xadrez, toggle de PMA, grade, overlays (bones, regions, mesh, bounding boxes, paths, clipping,
tamanho declarado, bounds da animação), sequência de clipes com mix, captura PNG e gravação WebM.
Teclado: Espaço play/pause, F enquadrar, ←/→ passo de 1/30 s, L loop, B bones.

## Estrutura

- `src/core/` — parsers, agrupamento, checks e relatório. Puro, testado no Vitest.
- `src/runtime/` — carga manual via spine-core, sonda offscreen de animações, preview PixiJS.
- `src/state/` — pipeline de análise e estado do app.
- `src/ui/` — React. Textos em `src/ui/strings.ts`.

## Licença

Os runtimes Spine exigem licença do Spine Editor para uso em produtos; veja
[esotericsoftware.com/spine-runtimes-license](https://esotericsoftware.com/spine-runtimes-license).
