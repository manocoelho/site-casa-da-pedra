# Casa da Pedra

Plataforma de reserva de flats — **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase**, pronta para deploy no **Vercel**.

## Arquitetura (SRP)

```
src/
├── app/                      # Rotas (finas): apenas compõem componentes
│   ├── (auth)/login          # /login
│   ├── (auth)/cadastro       # /cadastro
│   ├── admin/                # /admin (restrito a role 'admin')
│   │   ├── actions.ts        # Server Actions (invalidação de cache)
│   │   ├── layout.tsx        # Validação de sessão e role 'admin'
│   │   └── page.tsx          # Server Component: busca flats e compõe dashboard
│   └── auth/callback         # Retorno OAuth + confirmação de e-mail
├── components/               # APENAS UI (sem regras de negócio / sem acesso ao banco)
│   ├── admin/                # AdminDashboard, PhotoUploadForm, FlatPhotoManager, FlatEditModal
│   ├── landing/              # HeroSection, FlatList, FlatCard, ImageCarousel…
│   ├── ui/                   # Primitivos: Button, TextField, Alert, Divider…
│   ├── auth/                 # Telas e formulários de autenticação
│   └── layout/               # Header, Footer etc.
├── hooks/                    # Estado React (usePhotoUpload, useAuthUser, useLoginForm…)
├── services/                 # Acesso ao Supabase / APIs externas
│   ├── auth.ts               # ← todo o Supabase Auth isolado aqui
│   ├── flats.ts              # Operações de banco para flats e fotos
│   ├── flats.server.ts       # Consultas server-cached ("use cache")
│   ├── storage.ts            # ← Supabase Storage (upload com progresso, delete, rollback)
│   └── users.ts              # Perfis (public.users)
├── types/                    # Interfaces TS (database.ts, entities.ts, storage.ts, auth.ts)
├── lib/                      # Infra: clientes Supabase, env, rotas, validadores
└── proxy.ts                  # (antigo middleware) renova sessão + protege rotas
supabase/migrations/          # Schema SQL, RLS, Storage, Realtime
```

Fluxo: **Componente → Hook → Service → Supabase**. Services recebem o cliente
Supabase por injeção (`createAuthService(client)`), funcionando no browser e no servidor.

## Configuração

### 1. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(Supabase → Project Settings → API).

### 2. Banco de dados

Opção A — Supabase CLI:

```bash
npx supabase init          # apenas na primeira vez (cria supabase/config.toml)
npx supabase link --project-ref <SEU_REF>
npx supabase db push
npm run db:types           # opcional: regenera src/types/database.ts
```

Opção B — cole os arquivos de `supabase/migrations/` (em ordem) no **SQL Editor** e execute.

A migration `20261012000000_seed_initial_flats.sql` cadastra os 2 flats iniciais exibidos na
landing page. As fotos usadas por ela (`public/images/`) são **provisórias** — substitua pelas
fotos reais (ou envie ao bucket `flat-photos` e atualize `flat_photos.url_imagem`).

Para promover o primeiro administrador (SQL Editor):

```sql
update public.users set role = 'admin' where email = 'voce@exemplo.com';
```

### 3. Autenticação no painel do Supabase

- **Authentication → URL Configuration**
  - Site URL: `https://SEU-DOMINIO.vercel.app`
  - Redirect URLs: `http://localhost:3000/auth/callback`,
    `https://SEU-DOMINIO.vercel.app/auth/callback` e, para previews,
    `https://*-SEU-TIME.vercel.app/auth/callback`
- **Authentication → Providers**
  - **Google**: crie um OAuth Client no Google Cloud Console; URI de redirecionamento autorizado:
    `https://SEU-PROJETO.supabase.co/auth/v1/callback`
  - **Facebook**: crie um app em developers.facebook.com (produto *Facebook Login*);
    Valid OAuth Redirect URI: `https://SEU-PROJETO.supabase.co/auth/v1/callback`

### 4. Rodar localmente

```bash
npm run dev
```

## Deploy no Vercel

1. Importe o repositório no Vercel (framework detectado automaticamente).
2. Em **Settings → Environment Variables**, adicione as variáveis do `.env.example`
   (com `NEXT_PUBLIC_SITE_URL` apontando para o domínio de produção).
3. Adicione as URLs do Vercel nas Redirect URLs do Supabase (passo 3).

## Regras de negócio garantidas no banco

- Perfil em `public.users` criado automaticamente por trigger (role sempre `client`).
- Clientes não conseguem alterar o próprio `role`/`email`.
- Reservas: `data_fim > data_inicio`, sem sobreposição de reservas ativas no mesmo flat
  (exclusion constraint), clientes só criam reservas `pendente` futuras e só podem cancelá-las.
- Feedback: nota 1–5, um por usuário/flat, apenas após estadia `concluida`.
- Mensagens: visíveis só para remetente/destinatário; Realtime habilitado.
- Storage: bucket público `flat-photos` (upload apenas por admins).

## Painel Administrativo (/admin)

Restrito exclusivamente a usuários com `role: 'admin'`:
- **Proteção em duas camadas**:
  - `proxy.ts`: Protege a rota exigindo autenticação do usuário.
  - `src/app/admin/layout.tsx`: Valida no banco se `profile.role === 'admin'`. Usuários não-administradores recebem a tela informativa `<AccessDenied />`.
- **Métricas e Gestão dos Flats**: Exibe resumo de flats, total de fotos, média de diárias e capacidade total. Permite alternar entre os flats e atualizar dados cadastrais.
- **Gestão de Fotos e Supabase Storage**:
  - `src/services/storage.ts`: Isola operações do bucket `flat-photos`. Realiza upload com cálculo real de progresso percentual via XHR, gera URL pública e salva registro na tabela `flat_photos`. Conta com rollback automático caso ocorra erro no banco.
  - `src/components/admin/PhotoUploadForm.tsx`: Segue estritamente o SRP (apenas UI de seleção de arquivo e barra de progresso visual).
  - **Exclusão de Fotos**: Remove o registro do banco de dados e limpa o arquivo físico do storage, invalidando o cache via Server Action (`revalidateFlatsCache`).

## Reservas e Disponibilidade (/flats/[id])

- **Página de Detalhes**: Exibe carrossel de fotos em alta resolução, lista de comodidades, localização em Bananeiras/PB e detalhes de capacidade e diária.
- **Calendário Interativo (`ReservationCalendar` & `react-day-picker`)**:
  - Localizado em português (`pt-BR`).
  - Bloqueia automaticamente datas no passado e períodos já reservados.
  - O service `src/services/reservations.ts` busca intervalos ocupados via RPC segura `get_flat_occupied_ranges(flatId)`.
  - Calcula quantidade de noites e valor total em tempo real.
  - Usuários autenticados podem submeter pedidos de reserva com status `pendente`, garantido contra sobreposições pela constraint exclusion no banco (`reservations_sem_sobreposicao`).

## Sistema de Feedback (`FeedbackSection`)

- **Resumo de Avaliações**: Exibe média geral de estrelas (1 a 5), total de depoimentos e barras de distribuição percentual por nota.
- **Cards Modernos**: Apresenta avatar com iniciais do autor, selo de estadia confirmada, data em português e texto da avaliação.
- **Envio de Avaliação**: Usuários logados podem avaliar de 1 a 5 estrelas e redigir comentários via `src/services/feedbacks.ts`, com validação isolada via hook `useFeedback`.

## Chat em Tempo Real (/chat e Widget Flutuante)

- **Supabase Realtime**: Streaming bidirecional de mensagens na tabela `messages` via canal WebSocket (`postgres_changes` com evento `INSERT`).
- **Hook `useChat(userId, receiverId)`**:
  - Abstrai todo o gerenciamento de subscrições WebSocket e desinscrição no ciclo de vida do componente (`supabase.removeChannel`).
  - Carrega o histórico da conversa e atualiza o estado local reativamente com deduplicação de mensagens.
- **Interface Estilo WhatsApp Web (`/chat`)**:
  - Barra lateral com lista de conversas, busca em tempo real, avatar e prévia da última mensagem.
  - Janela principal com balões de conversa, scroll automático, status em tempo real e envio rápido com tecla `Enter`.
- **Widget Flutuante (`ChatFloatingWidget`)**:
  - Botão flutuante no canto inferior direito em todas as páginas públicas para contato instantâneo com o anfitrião.
- **Segurança e RLS**:
  - Mensagens visíveis unicamente para remetente e destinatário (`(auth.uid() in (sender_id, receiver_id))`).
  - Restrição de auto-envio (`sender_id <> receiver_id`).

## Scripts

| Script              | Descrição                                   |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                 |
| `npm run build`     | Build de produção                           |
| `npm run lint`      | ESLint                                      |
| `npm run typecheck` | Verificação de tipos                        |
| `npm run db:types`  | Gera tipos do banco via Supabase CLI        |
