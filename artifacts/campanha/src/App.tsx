import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CampanhaProvider } from "@/contexts/CampanhaContext";
import { getDashboardPath } from "@/lib/dashboard-path";
import LoginPage from "@/pages/login";
import DashboardLiderPage from "@/pages/dashboard-lider";
import DashboardCoordenadorRegionalPage from "@/pages/dashboard-coordenador-regional";
import DashboardCoordenadorGeralPage from "@/pages/dashboard-coordenador-geral";
import DashboardVereadorPage from "@/pages/dashboard-vereador";
import ContatosPage from "@/pages/contatos";
import ContatoFormPage from "@/pages/contato-form";
import RegioesPage from "@/pages/regioes";
import RegiaoDetalhePage from "@/pages/regiao-detalhe";
import AgendaPage from "@/pages/agenda";
import MapaPage from "@/pages/mapa";
import ConfiguracaoPage from "@/pages/configuracao";
import UsuariosPage from "@/pages/usuarios";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();


function AuthGuard({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!usuario && location !== "/login") return <Redirect to="/login" />;

  if (usuario && location === "/login") {
    return <Redirect to={getDashboardPath(usuario.tipo)} />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard/vereador" component={DashboardVereadorPage} />
      <Route path="/dashboard/coordenador-geral" component={DashboardCoordenadorGeralPage} />
      <Route path="/dashboard/coordenador-regional" component={DashboardCoordenadorRegionalPage} />
      <Route path="/dashboard/lider" component={DashboardLiderPage} />
      <Route path="/contatos/novo" component={() => <ContatoFormPage modo="novo" />} />
      <Route path="/contatos/:id/editar" component={() => <ContatoFormPage modo="editar" />} />
      <Route path="/contatos" component={ContatosPage} />
      <Route path="/regioes/:id" component={RegiaoDetalhePage} />
      <Route path="/regioes" component={RegioesPage} />
      <Route path="/agenda" component={AgendaPage} />
      <Route path="/mapa" component={MapaPage} />
      <Route path="/configuracao" component={ConfiguracaoPage} />
      <Route path="/usuarios" component={UsuariosPage} />
      <Route path="/">
        <RootRedirect />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RootRedirect() {
  const { usuario } = useAuth();
  return usuario ? <Redirect to={getDashboardPath(usuario.tipo)} /> : <Redirect to="/login" />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CampanhaProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AuthGuard>
              <AppRoutes />
            </AuthGuard>
          </AuthProvider>
        </WouterRouter>
      </CampanhaProvider>
    </QueryClientProvider>
  );
}

export default App;
