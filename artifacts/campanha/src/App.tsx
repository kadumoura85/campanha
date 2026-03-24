import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import DashboardLiderPage from "@/pages/dashboard-lider";
import DashboardCoordenadorPage from "@/pages/dashboard-coordenador";
import DashboardVereadorPage from "@/pages/dashboard-vereador";
import ContatosPage from "@/pages/contatos";
import ContatoFormPage from "@/pages/contato-form";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!usuario && location !== "/login") {
    return <Redirect to="/login" />;
  }

  if (usuario && location === "/login") {
    if (usuario.tipo === "vereador") return <Redirect to="/dashboard/vereador" />;
    if (usuario.tipo === "coordenador") return <Redirect to="/dashboard/coordenador" />;
    return <Redirect to="/dashboard/lider" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { usuario } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard/lider">
        {usuario?.tipo !== "lider" && usuario ? <Redirect to={`/dashboard/${usuario.tipo}`} /> : <DashboardLiderPage />}
      </Route>
      <Route path="/dashboard/coordenador">
        {usuario?.tipo !== "coordenador" && usuario ? <Redirect to={`/dashboard/${usuario.tipo === "vereador" ? "vereador" : "lider"}`} /> : <DashboardCoordenadorPage />}
      </Route>
      <Route path="/dashboard/vereador">
        {usuario?.tipo !== "vereador" && usuario ? <Redirect to={`/dashboard/${usuario.tipo}`} /> : <DashboardVereadorPage />}
      </Route>
      <Route path="/contatos/novo" component={() => <ContatoFormPage modo="novo" />} />
      <Route path="/contatos/:id/editar" component={() => <ContatoFormPage modo="editar" />} />
      <Route path="/contatos" component={ContatosPage} />
      <Route path="/">
        {usuario ? (
          <Redirect to={`/dashboard/${usuario.tipo}`} />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithAuth() {
  const [location] = useLocation();
  return (
    <AuthGuard>
      <AppRoutes />
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppWithAuth />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
