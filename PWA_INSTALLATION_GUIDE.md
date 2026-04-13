# Guia de Instalação - App Campanha Política

## 📱 Instalar como App no Celular

Sua aplicação agora pode ser instalada como um app nativo em Android e iOS!

### Android - Chrome

1. **Abra o navegador Chrome** e acesse a aplicação
2. **Clique no menu** (três pontos no canto superior direito)
3. **Selecione "Instalar app"** ou **"Add to Home screen"**
4. **Confirme a instalação** clicando em "Instalar"
5. O app aparecerá na sua tela (como um ícone normal)

**Alternativa:** Alguns navegadores mostram um banner automático oferecendo instalar o app.

### iOS - Safari

1. **Abra Safari** e acesse a aplicação
2. **Clique no ícone de compartilhamento** (seta apontando para cima)
3. **Selecione "Adicionar à Tela de Início"**
4. **Nomeie o app** (ou use o nome padrão "Campanha")
5. **Clique em "Adicionar"**
6. O app aparecerá na sua tela inicial como um ícone

### Windows/Mac - Navegadores

#### Chrome/Edge
1. Clique nos **três pontos** no canto superior direito
2. Selecione **"Instalar app"** ou **"Install Campanha"**
3. Clique em **"Instalar"** quando solicitado

#### Firefox
1. Clique no **menu** (três linhas horizontais)
2. Selecione **"Instalar aplicativo"**

---

## ✨ Benefícios do App

✅ **Funciona Offline** - Acesse dados cacheados sem internet  
✅ **Atalho Rápido** - Ícone direto na tela inicial/desktop  
✅ **Interface Nativa** - Barra de endereço oculta, tema visual adaptado  
✅ **Notificações** - Receba alertas em tempo real  
✅ **Melhor Performance** - Carrega mais rápido após primeira instalação  

---

## 🔧 Recursos Implementados

A aplicação agora inclui:

- **Service Worker** otimizado com cache inteligente
- **Manifest.json** com configurações completas para iOS e Android
- **Icons em múltiplos tamanhos** para todas as plataformas
- **Meta tags** para melhor integração nativa
- **Detecção automática** de modo standalone
- **Prompt de instalação** visual e intuitivo

---

## 🔄 Funcionamento Offline

### ✅ Funciona Offline
- Todas as páginas HTML
- CSS, JavaScript e imagens
- Dados previamente carregados

### ❌ Requer Internet
- Requisições à API (`/api/*`)
- Upload de arquivos (`/uploads/*`)
- Dados novos do servidor

Quando offline, a aplicação mantém todos os dados já carregados em cache e informa quando uma ação requer internet.

---

## 🐛 Dicas de Desenvolvimento

### Limpar Cache (Development)
```javascript
// No console do navegador
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
```

### Testar Service Worker
```bash
# Abra DevTools
F12 ou Cmd+Option+I (Mac)

# Vá até a aba "Application"
# Navegue até "Service Workers"
# Verifique se está registered e rodiando
```

### Forçar Update do Service Worker
```javascript
// No console
navigator.serviceWorker.controller.postMessage({ 
  type: 'SKIP_WAITING' 
});
```

---

## 📊 Compatibilidade

| Plataforma | Status | Browser | Versão Mínima |
|-----------|--------|---------|--------------|
| Android | ✅ Completo | Chrome | 42+ |
| Android | ✅ Completo | Firefox | 51+ |
| Android | ⚠️ Parcial | Samsung Internet | 5+ |
| iOS | ✅ Completo | Safari | 11.3+ |
| Windows | ✅ Completo | Chrome/Edge | 85+ |
| macOS | ✅ Completo | Chrome/Edge | 85+ |

---

## 🆘 Troubleshooting

### App não aparece para instalar
- Certifique-se de que está em HTTPS (ou localhost)
- Recarregue a página (Ctrl+Shift+R / Cmd+Shift+R)
- Limpe o cache do navegador
- Aguarde 1-2 minutos pelo service worker registrar

### App não funciona offline
- Verifique se a página foi carregada uma vez online
- Os dados precisam ser cacheados antes de ficar offline
- Não funciona em abas anônimas

### Desinstalar o app
- **Android**: Aperte e segure no ícone → "Desinstalar"
- **iOS**: Aperte e segure no ícone → "Remover App" → "Remover do Início"
- **Windows/Mac**: Clique com botão direito no ícone → "Desinstalar"

---

## 📚 Próximas Melhorias

- [ ] Notificações push
- [ ] Sincronização de dados em background
- [ ] Widgets na tela inicial
- [ ] Integração com câmera nativa
- [ ] Acesso a contatos do celular

---

**Versão**: 1.0  
**Última atualização**: 2026-04-12
