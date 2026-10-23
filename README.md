Aura Farming — Arquitetura e Stack Tecnológica
1. Objetivo técnico e plataforma
- Plataforma-alvo: Android.
- Publicação: Google Play Store.
- Meta de desempenho: 60 FPS.
- Linguagem principal: TypeScript.
- A arquitetura deve priorizar sincronização musical precisa, resposta rápida aos toques e animações suaves.
2. Stack tecnológica
- React Native + Expo + EAS Build: desenvolvimento mobile e geração do arquivo .aab para a Play Store. Usar development build, não o Expo Go.
- TypeScript: linguagem principal.
- React Native Reanimated: animações das notas e da barra de aura, incluindo useFrameCallback quando apropriado.
- react-native-gesture-handler: captura de toques com baixa latência.
- Áudio / Master Clock: avaliar primeiro a react-native-audio-api (Software Mansion), com API semelhante à Web Audio e currentTime.
- Expo Haptics (ou solução compatível): vibração leve e breve após um acerto confirmado.
- Zustand: estado da fase para eventos como acerto, erro, fim de fase, margem de risco e estrelas.
- MMKV (ou AsyncStorage): persistência local de progresso, estrelas e offset de calibração.
2.1. Estratégia de áudio
O expo-av está obsoleto, e o expo-audio informa a posição da música em intervalos, sem precisão de amostra, o que pode gerar tremor de sincronização. Avaliar a react-native-audio-api como primeira opção.

Alternativa: usar um relógio monotônico (performance.now) ancorado no início da música, com ressincronização periódica pela posição do player.

A escolha definitiva deve considerar latência, compatibilidade com a versão do Expo e integração com as animações. Confirmar as versões e a compatibilidade antes de decidir.

Se a precisão de timing for insuficiente no protótipo, considerar Godot ou Unity, que oferecem relógio de áudio nativo — por exemplo, AudioSettings.dspTime no Unity — e ferramentas de compensação de latência.
3. Sincronização musical e detecção de acertos
3.1. Princípio de sincronização
A sincronização será baseada em colisão temporal, não em verificar se o quadrado cruzou visualmente as coordenadas do alvo.

A reprodução da música será a referência temporal principal (Master Clock). A posição visual das notas será calculada com base no tempo da música e no instante programado para o acerto.
3.2. Beatmap — mapa de notas
Cada fase terá um arquivo de dados, preferencialmente JSON, com as notas da música. A duração e a quantidade de notas podem variar entre as fases.

Cada nota deverá registrar, no mínimo:
- lane: pista correspondente, esquerda ou direita.
- timeToHitMs: instante programado para acertar a nota, em milissegundos desde o início da referência temporal da música.
Exemplo de estrutura conceitual de uma nota:
{
  "lane": "left",
  "timeToHitMs": 3500
}
Nesse exemplo, o momento ideal do toque é 3,5 segundos após o início da referência temporal da música.

O beatmap deve definir as notas originais da fase. Elementos especiais, como caveiras e escudos, não devem modificar o total original de notas usado para calcular as porcentagens.
3.3. Animação e tempo de queda
O jogo utilizará um tempo de antecipação fixo para a queda visual. Exemplo: tempo de queda de 1000 ms.

Uma nota programada para ser acertada aos 3500 ms começa a cair aos 2500 ms e leva aproximadamente um segundo para alcançar o centro do alvo.

A posição visual será calculada com base no tempo atual da música e no instante programado da nota, em vez de depender apenas da distância percorrida a cada frame.
3.4. Janela de tolerância (Hit Window)
Quando o jogador tocar um controle, o sistema registrará o instante do toque em relação à referência temporal da música.

Cálculo:

erroTemporalMs = tempoDoToqueMs − timeToHitMs − offsetDeCalibracaoMs
- Janela inicial proposta: de −100 ms a +100 ms.
- Dentro da janela: a nota é registrada como acerto.
- Fora da janela: o toque não conta como acerto daquela nota.
- Se a nota ultrapassar o prazo de acerto sem uma entrada válida, é registrada como erro.
- A janela de ±100 ms é um valor inicial proposto e poderá ser ajustada durante os testes.
- Cada nota deverá ser resolvida apenas uma vez, evitando contagem duplicada.
3.5. Calibração de latência
O Android apresenta latência de áudio variável entre aparelhos, especialmente com fones Bluetooth. Para reduzir erros causados por latência, o jogo terá:
- Um ajuste de offset em milissegundos, aplicado ao cálculo do erro temporal e ao posicionamento visual das notas.
- Opcionalmente, um mini teste de calibração, no qual o jogador toca no ritmo de uma sequência de batidas para sugerir um offset automaticamente.
- O offset será salvo localmente e poderá ser alterado a qualquer momento nas configurações.
4. Atualização visual e desempenho
As animações utilizarão React Native Reanimated.
- A posição deve ser derivada do tempo de referência, e não de uma soma fixa de pixels por frame.
- Se houver uma queda momentânea de desempenho, a nota poderá avançar para a posição correspondente ao tempo atual, em vez de permanecer visualmente atrasada.
- A posição das notas deve ficar em shared values do Reanimated, e não no estado global (Zustand), para evitar renderizações por frame.
- A implementação deve garantir que o relógio de áudio seja consultado ou disponibilizado de forma compatível com a biblioteca de áudio escolhida.
- A meta de desempenho é 60 FPS.
5. Captura de toque
Componentes como Pressable e TouchableOpacity passam pela thread JS e podem introduzir atraso. A captura dos toques deve usar react-native-gesture-handler (ou eventos rodando como worklet na thread de UI), registrando o timestamp do toque o mais cedo possível.

A detecção de acertos e erros não dependerá da posição visual exata do quadrado na tela. A interface representa o andamento das notas, enquanto a lógica temporal determina se o toque ocorreu dentro da janela válida.

Essa separação ajuda a manter a consistência em dispositivos com diferentes dimensões de tela e taxas de atualização.
6. Modelagem do estado da partida
O estado da partida deve separar dados de gameplay, dados visuais e resultados.
6.1. Dados essenciais
- Referência temporal da música.
- Beatmap e notas ainda não resolvidas.
- Total original de notas da fase.
- Notas acertadas normalmente e notas erradas.
- Acertos bônus concedidos pelo escudo.
- Estado e temporizador do escudo.
- Estado dos elementos caveira e escudo que estejam ativos.
- Margem de sobrevivência e condição de derrota antecipada.
- Porcentagem real de acertos, estrelas e estado final da fase.
6.2. Regras de contagem
O total original de notas é fixo para a fase e é definido pelo beatmap. Ele pode variar entre fases, mas nunca aumenta devido ao escudo.
- Cada nota original é resolvida uma única vez como acerto ou erro.
- Cada nota acertada com o escudo ativo concede o acerto normal mais 2 acertos bônus para sobrevivência.
- acertosValidosSobrevivencia = acertosNormais + acertosBonus.
- minimoSobrevivencia = teto(totalNotasOriginais × 0,51).
- A porcentagem real é calculada usando somente as notas originais acertadas e o total original de notas.
- Os bônus do escudo não aumentam a porcentagem, as estrelas ou a recompensa “67”.
- A derrota antecipada deve considerar apenas oportunidades futuras reais e os bônus que ainda possam ser obtidos durante o tempo restante do escudo.
- Ao pausar, o relógio da partida e o temporizador do escudo devem ficar suspensos; ao retomar, devem continuar sem dessincronização.
6.3. Elementos especiais
- Caveiras e escudos surgem aleatoriamente nos intervalos entre notas, sem substituir notas do beatmap.
- Tocar uma caveira sem proteção causa Game Over imediato.
- Com o escudo ativo, o jogador fica imune às caveiras durante 10 segundos.
- A lógica de colisão/interação desses elementos deve ser independente da contagem de notas originais.
7. Persistência local e progresso
A persistência local (MMKV ou AsyncStorage) deve guardar, no mínimo:
- Última fase registrada para o botão Play.
- Progresso de desbloqueio das fases.
- Estrelas conquistadas por fase.
- Offset de calibração de áudio.
Comportamento do botão Play:
- Se houver progresso salvo, iniciar a última fase registrada.
- Se não houver progresso salvo, iniciar a fase de nível 1.
8. Plano de prototipagem e testes
Primeiro passo: protótipo de sincronização. Antes de construir todas as telas, criar um protótipo com uma música e cerca de 20 notas e testar em 2 a 3 celulares Android reais, incluindo um aparelho de entrada. Só então consolidar a escolha da biblioteca de áudio.

Testar:
- Sincronização entre áudio e notas.
- Latência dos toques em dispositivos reais.
- Latência com fone Bluetooth e com fone com fio.
- Precisão da janela de tolerância e eficácia da calibração de offset.
- Comportamento durante quedas de FPS.
- Ausência de notas contabilizadas mais de uma vez.
- Consistência em diferentes dimensões de tela e taxas de atualização.
- Vibração leve e breve ao acertar uma nota, em vários aparelhos.
- Pausa e retomada sem dessincronizar música e notas.
- Cálculo correto da barra de aura, estrelas e derrota antecipada.
- Game Over imediato ao tocar uma caveira sem proteção.
- Imunidade à caveira durante os 10 segundos do escudo.
- Cada nota acertada com o escudo concede 3 acertos para sobrevivência, sem alterar o total original nem as porcentagens.
- Desbloqueio correto das fases e exibição da recompensa “67”.
9. Publicação na Google Play Store
- Criar uma conta de desenvolvedor Google Play; a taxa indicada na documentação de origem é de US$ 25, paga uma única vez.
- Contas pessoais novas podem exigir teste fechado com testadores por um período mínimo antes da publicação em produção. Confirmar as regras atuais no Play Console.
- O aplicativo precisa mirar o target API level exigido pelo Google no momento da publicação.
- Usar músicas próprias, licenciadas ou royalty-free.
- Preparar política de privacidade, classificação etária, ícones e screenshots.
