import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CampanhaProvider } from "@/contexts/CampanhaContext";
import { getDashboardPath } from "@/lib/dashboard-path";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

const LoginPage = lazy(() => import("@/pages/login"));
const DashboardLiderPage = lazy(() => import("@/pages/dashboard-lider"));
const DashboardCoordenadorRegionalPage = lazy(() => import("@/pages/dashboard-coordenador-regional"));
const DashboardCoordenadorGeralPage = lazy(() => import("@/pages/dashboard-coordenador-geral"));
const DashboardVereadorPage = lazy(() => import("@/pages/dashboard-vereador"));
const ContatosPage = lazy(() => import("@/pages/contatos"));
const ContatoFormPage = lazy(() => import("@/pages/contato-form"));
const RegioesPage = lazy(() => import("@/pages/regioes"));
const RegiaoNovaPage = lazy(() => import("@/pages/regiao-nova"));
const RegiaoDetalhePage = lazy(() => import("@/pages/regiao-detalhe"));
const AgendaPage = lazy(() => import("@/pages/agenda"));
const MapaPage = lazy(() => import("@/pages/mapa"));
const ConfiguracaoPage = lazy(() => import("@/pages/configuracao"));
const UsuariosPage = lazy(() => import("@/pages/usuarios"));
const NotFound = lazy(() => import("@/pages/not-found"));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}


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
    return <Redirect to={getDashboardPath(usuario?.tipo)} />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/dashboard/vereador" component={DashboardVereadorPage} />
        <Route path="/dashboard/coordenador-geral" component={DashboardCoordenadorGeralPage} />
        <Route path="/dashboard/coordenador" component={DashboardCoordenadorRegionalPage} />
        <Route path="/dashboard/coordenador-regional" component={DashboardCoordenadorRegionalPage} />
        <Route path="/dashboard/lider" component={DashboardLiderPage} />
        <Route path="/contatos/novo" component={() => <ContatoFormPage modo="novo" />} />
        <Route path="/contatos/:id/editar" component={() => <ContatoFormPage modo="editar" />} />
        <Route path="/contatos" component={ContatosPage} />
        <Route path="/regioes/nova" component={RegiaoNovaPage} />
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
    </Suspense>
  );
}

function RootRedirect() {
  const { usuario } = useAuth();
  return usuario ? <Redirect to={getDashboardPath(usuario?.tipo)} /> : <Redirect to="/login" />;
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
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </CampanhaProvider>
    </QueryClientProvider>
  );
}

export default App;
