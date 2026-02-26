import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import { LojistaAuthProvider } from "@/hooks/useLojistaAuth";
import { TrackingProvider } from "@/hooks/useTracking";
import { PageTransition } from "@/components/PageTransition";
import { ThemeProvider } from "@/hooks/useTheme";

// SaaS pages
import LandingPage from "./pages/LandingPage";
import LojistaLogin from "./pages/LojistaLogin";
import LojistaRegistro from "./pages/LojistaRegistro";
import VerificarEmail from "./pages/VerificarEmail";
import RedefinirSenha from "./pages/RedefinirSenha";

// Painel Lojista
import PainelLayout from "./components/layout/PainelLayout";
import PainelInicio from "./pages/painel/PainelInicio";
import LojaOverview from "./pages/painel/LojaOverview";
import LojaPedidos from "./pages/painel/LojaPedidos";
import LojaProdutos from "./pages/painel/LojaProdutos";
import LojaCategorias from "./pages/painel/LojaCategorias";
import LojaEstoque from "./pages/painel/LojaEstoque";
import LojaFretes from "./pages/painel/LojaFretes";
import LojaClientes from "./pages/painel/LojaClientes";
import LojaConteudo from "./pages/painel/LojaConteudo";
import LojaCupons from "./pages/painel/LojaCupons";
import LojaTemas from "./pages/painel/LojaTemas";
import LojaConfiguracoes from "./pages/painel/LojaConfiguracoes";
import LojaGateways from "./pages/painel/LojaGateways";
import LojaAssinatura from "./pages/painel/LojaAssinatura";
import LojaPerfil from "./pages/painel/LojaPerfil";
import LojaPixels from "./pages/painel/LojaPixels";
import LojaPaginas from "./pages/painel/LojaPaginas";
import LojaRelatorios from "./pages/painel/LojaRelatorios";
import LojaPacotesAvaliacoes from "./pages/painel/LojaPacotesAvaliacoes";
import LojaNewsletter from "./pages/painel/LojaNewsletter";

// Loja demo
import Index from "./pages/Index";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import SuccessPage from "./pages/SuccessPage";
import NotFound from "./pages/NotFound";

// Admin
import AdminLogin from "./pages/AdminLogin";
import AdminSetup from "./pages/AdminSetup";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminLayout from "./components/AdminLayout";
import AdminLojistas from "./pages/AdminLojistas";
import AdminTeam from "./pages/AdminTeam";
import AdminConfigEmpresa from "./pages/AdminConfigEmpresa";
import AdminEstatisticas from "./pages/AdminEstatisticas";
import AdminAvisos from "./pages/AdminAvisos";
import AdminTickets from "./pages/AdminTickets";
import AdminPacotesComentarios from "./pages/AdminPacotesComentarios";
import AdminGateways from "./pages/AdminGateways";
import AdminPlanos from "./pages/AdminPlanos";
import SegurancaConfirmacao from "./pages/SegurancaConfirmacao";

// Loja Pública (Host-Based)
import LojaLayoutComponent from "./components/LojaLayout";
import LojaHome from "./pages/loja/LojaHome";
import LojaProduto from "./pages/loja/LojaProduto";
import LojaCart from "./pages/loja/LojaCart";
import LojaCheckout from "./pages/loja/LojaCheckout";
import LojaSucesso from "./pages/loja/LojaSucesso";
import LojaPagina from "./pages/loja/LojaPagina";
import ContaLogin from "./pages/loja/ContaLogin";
import ContaRegistro from "./pages/loja/ContaRegistro";
import ContaVerificarEmail from "./pages/loja/ContaVerificarEmail";
import ContaRecuperarSenha from "./pages/loja/ContaRecuperarSenha";
import ContaRedefinirSenha from "./pages/loja/ContaRedefinirSenha";
import ContaPerfil from "./pages/loja/ContaPerfil";

import { queryClient } from '@/config/queryClient';

// ============================================
// 🌐 Host-Based Routing Logic
// ============================================

function isSaaSHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.endsWith('.vercel.app') || hostname.endsWith('.lovable.app')) return true;

  const saasDomain = import.meta.env.VITE_SAAS_DOMAIN;
  if (saasDomain) {
    return hostname === saasDomain || hostname === `www.${saasDomain}` || hostname === `app.${saasDomain}`;
  }

  return false;
}

// SaaS App (painel, admin, landing, demo)
const SaaSApp = () => (
  <ThemeProvider>
    <AuthProvider>
      <LojistaAuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TrackingProvider>
                <Routes>
                  {/* SaaS routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LojistaLogin />} />
                  <Route path="/registro" element={<LojistaRegistro />} />
                  <Route path="/verificar-email" element={<VerificarEmail />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                  <Route path="/seguranca-confirmacao" element={<SegurancaConfirmacao />} />

                  {/* Painel Lojista */}
                  <Route path="/painel" element={<PainelLayout />}>
                    <Route index element={<PainelInicio />} />
                    <Route path="loja/:id" element={<LojaOverview />} />
                    <Route path="loja/:id/pedidos" element={<LojaPedidos />} />
                    <Route path="loja/:id/produtos" element={<LojaProdutos />} />
                    <Route path="loja/:id/categorias" element={<LojaCategorias />} />
                    <Route path="loja/:id/estoque" element={<LojaEstoque />} />
                    <Route path="loja/:id/fretes" element={<LojaFretes />} />
                    <Route path="loja/:id/clientes" element={<LojaClientes />} />
                    <Route path="loja/:id/conteudo" element={<LojaConteudo />} />
                    <Route path="loja/:id/cupons" element={<LojaCupons />} />
                    <Route path="loja/:id/temas" element={<LojaTemas />} />
                    <Route path="loja/:id/pixels" element={<LojaPixels />} />
                    <Route path="loja/:id/paginas" element={<LojaPaginas />} />
                    <Route path="loja/:id/relatorios" element={<LojaRelatorios />} />
                    <Route path="loja/:id/pacotes-avaliacoes" element={<LojaPacotesAvaliacoes />} />
                    <Route path="loja/:id/newsletter" element={<LojaNewsletter />} />
                    <Route path="loja/:id/configuracoes" element={<LojaConfiguracoes />} />
                    <Route path="loja/:id/gateways" element={<LojaGateways />} />
                    <Route path="loja/:id/integracoes" element={<LojaGateways />} />
                    <Route path="assinatura" element={<LojaAssinatura />} />
                    <Route path="perfil" element={<LojaPerfil />} />
                  </Route>

                  {/* Loja demo */}
                  <Route path="/loja-demo" element={<Index />} />
                  <Route path="/produto/:slug" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/sucesso" element={<SuccessPage />} />

                  {/* Admin auth */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/setup" element={<AdminSetup />} />
                  <Route path="/admin/recuperar-senha" element={<AdminForgotPassword />} />
                  <Route path="/admin/redefinir-senha" element={<AdminResetPassword />} />

                  {/* Admin panel */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/lojistas" replace />} />
                  <Route path="lojistas" element={<AdminLojistas />} />
                    <Route path="planos" element={<AdminPlanos />} />
                    <Route path="equipe" element={<AdminTeam />} />
                    <Route path="avisos" element={<AdminAvisos />} />
                    <Route path="tickets" element={<AdminTickets />} />
                    <Route path="configuracoes" element={<AdminConfigEmpresa />} />
                    <Route path="pacotes-comentarios" element={<AdminPacotesComentarios />} />
                    <Route path="integracoes" element={<AdminGateways />} />
                    <Route path="gateways" element={<AdminGateways />} />
                    <Route path="estatisticas" element={<AdminEstatisticas />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
            </TrackingProvider>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
      </LojistaAuthProvider>
    </AuthProvider>
  </ThemeProvider>
);

// Loja Pública App (subdomínio/domínio customizado)
const LojaPublicaApp = ({ hostname }: { hostname: string }) => (
  <CartProvider storageKey={`cart_${hostname}`}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<LojaLayoutComponent hostname={hostname} />}>
            <Route index element={<LojaHome />} />
            <Route path="/produto/:productSlug" element={<LojaProduto />} />
            <Route path="/cart" element={<LojaCart />} />
            <Route path="/checkout" element={<LojaCheckout />} />
            <Route path="/sucesso" element={<LojaSucesso />} />
            <Route path="/pagina/:slug" element={<LojaPagina />} />
            <Route path="/conta/login" element={<ContaLogin />} />
            <Route path="/conta/registro" element={<ContaRegistro />} />
            <Route path="/conta/verificar" element={<ContaVerificarEmail />} />
            <Route path="/conta/recuperar" element={<ContaRecuperarSenha />} />
            <Route path="/conta/redefinir" element={<ContaRedefinirSenha />} />
            <Route path="/conta" element={<ContaPerfil />} />
            <Route path="*" element={
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Página não encontrada</h1>
                <a href="/" className="text-primary hover:underline">Voltar à loja</a>
              </div>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </CartProvider>
);

const App = () => {
  const hostname = window.location.hostname;
  const isSaaS = isSaaSHost(hostname);

  return (
    <QueryClientProvider client={queryClient}>
      {isSaaS ? <SaaSApp /> : <LojaPublicaApp hostname={hostname} />}
    </QueryClientProvider>
  );
};

export default App;
