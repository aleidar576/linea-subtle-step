import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import { LojistaAuthProvider } from "@/hooks/useLojistaAuth";
import { TrackingProvider } from "@/hooks/useTracking";
import { PageTransition } from "@/components/PageTransition";
import { ThemeProvider } from "@/hooks/useTheme";
import { SaaSPixelProvider } from "@/hooks/useSaaSPixels";
import { queryClient } from '@/config/queryClient';
import GlobalLoader from "@/components/ui/GlobalLoader";
import BrandingInjector from "@/components/BrandingInjector";

// Static layout imports (never lazy — skeleton must not flash)
import PainelLayout from "./components/layout/PainelLayout";
import AdminLayout from "./components/AdminLayout";
import LojaLayoutComponent from "./components/LojaLayout";

// =============================================
// 🔄 LAZY PAGE IMPORTS — SaaS
// =============================================
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LojistaLogin = lazy(() => import("./pages/LojistaLogin"));
const LojistaRegistro = lazy(() => import("./pages/LojistaRegistro"));
const VerificarEmail = lazy(() => import("./pages/VerificarEmail"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const SegurancaConfirmacao = lazy(() => import("./pages/SegurancaConfirmacao"));

// =============================================
// 🔄 LAZY PAGE IMPORTS — Painel Lojista
// =============================================
const PainelInicio = lazy(() => import("./pages/painel/PainelInicio"));
const LojaOverview = lazy(() => import("./pages/painel/LojaOverview"));
const LojaPedidos = lazy(() => import("./pages/painel/LojaPedidos"));
const LojaProdutos = lazy(() => import("./pages/painel/LojaProdutos"));
const LojaCategorias = lazy(() => import("./pages/painel/LojaCategorias"));
const LojaEstoque = lazy(() => import("./pages/painel/LojaEstoque"));
const LojaFretes = lazy(() => import("./pages/painel/LojaFretes"));
const LojaClientes = lazy(() => import("./pages/painel/LojaClientes"));
const LojaConteudo = lazy(() => import("./pages/painel/LojaConteudo"));
const LojaCupons = lazy(() => import("./pages/painel/LojaCupons"));
const LojaTemas = lazy(() => import("./pages/painel/LojaTemas"));
const LojaConfiguracoes = lazy(() => import("./pages/painel/LojaConfiguracoes"));
const LojaPerfilLoja = lazy(() => import("./pages/painel/LojaPerfilLoja"));
const LojaGateways = lazy(() => import("./pages/painel/LojaGateways"));
const LojaAssinatura = lazy(() => import("./pages/painel/LojaAssinatura"));
const LojaPerfil = lazy(() => import("./pages/painel/LojaPerfil"));
const LojaPixels = lazy(() => import("./pages/painel/LojaPixels"));
const LojaPaginas = lazy(() => import("./pages/painel/LojaPaginas"));
const LojaRelatorios = lazy(() => import("./pages/painel/LojaRelatorios"));
const LojaPacotesAvaliacoes = lazy(() => import("./pages/painel/LojaPacotesAvaliacoes"));
const LojaNewsletter = lazy(() => import("./pages/painel/LojaNewsletter"));
const LojaIntegracoes = lazy(() => import("./pages/painel/LojaIntegracoes"));

// =============================================
// 🔄 LAZY PAGE IMPORTS — Loja Demo
// =============================================
const Index = lazy(() => import("./pages/Index"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const SuccessPage = lazy(() => import("./pages/SuccessPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// =============================================
// 🔄 LAZY PAGE IMPORTS — Admin
// =============================================
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const AdminForgotPassword = lazy(() => import("./pages/AdminForgotPassword"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const AdminLojistas = lazy(() => import("./pages/AdminLojistas"));
const AdminTeam = lazy(() => import("./pages/AdminTeam"));
const AdminConfigEmpresa = lazy(() => import("./pages/AdminConfigEmpresa"));
const AdminEstatisticas = lazy(() => import("./pages/AdminEstatisticas"));
const AdminAvisos = lazy(() => import("./pages/AdminAvisos"));
const AdminTickets = lazy(() => import("./pages/AdminTickets"));
const AdminPacotesComentarios = lazy(() => import("./pages/AdminPacotesComentarios"));
const AdminGateways = lazy(() => import("./pages/AdminGateways"));
const AdminPlanos = lazy(() => import("./pages/AdminPlanos"));
const AdminIntegracoes = lazy(() => import("./pages/AdminIntegracoes"));
const AdminMarketing = lazy(() => import("./pages/AdminMarketing"));
const AdminLandingPage = lazy(() => import("./pages/AdminLandingPage"));

// =============================================
// 🔄 LAZY PAGE IMPORTS — Loja Pública
// =============================================
const LojaHome = lazy(() => import("./pages/loja/LojaHome"));
const LojaCategoria = lazy(() => import("./pages/loja/LojaCategoria"));
const LojaProduto = lazy(() => import("./pages/loja/LojaProduto"));
const LojaCart = lazy(() => import("./pages/loja/LojaCart"));
const LojaCheckout = lazy(() => import("./pages/loja/LojaCheckout"));
const LojaSucesso = lazy(() => import("./pages/loja/LojaSucesso"));
const LojaPagina = lazy(() => import("./pages/loja/LojaPagina"));
const ContaLogin = lazy(() => import("./pages/loja/ContaLogin"));
const ContaRegistro = lazy(() => import("./pages/loja/ContaRegistro"));
const ContaVerificarEmail = lazy(() => import("./pages/loja/ContaVerificarEmail"));
const ContaRecuperarSenha = lazy(() => import("./pages/loja/ContaRecuperarSenha"));
const ContaRedefinirSenha = lazy(() => import("./pages/loja/ContaRedefinirSenha"));
const ContaPerfil = lazy(() => import("./pages/loja/ContaPerfil"));

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
    <BrandingInjector />
    <AuthProvider>
      <LojistaAuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TrackingProvider>
              <SaaSPixelProvider>
                <Suspense fallback={<GlobalLoader />}>
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
                      <Route path="loja/:id/perfil-loja" element={<LojaPerfilLoja />} />
                      <Route path="loja/:id/gateways" element={<LojaGateways />} />
                      <Route path="loja/:id/integracoes" element={<LojaIntegracoes />} />
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
                      <Route path="integracoes" element={<AdminIntegracoes />} />
                      <Route path="marketing" element={<AdminMarketing />} />
                      <Route path="gateways" element={<AdminGateways />} />
                      <Route path="estatisticas" element={<AdminEstatisticas />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SaaSPixelProvider>
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
        <Suspense fallback={<GlobalLoader />}>
          <Routes>
            <Route element={<LojaLayoutComponent hostname={hostname} />}>
              <Route index element={<LojaHome />} />
              <Route path="/categoria/:categorySlug" element={<LojaCategoria />} />
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
        </Suspense>
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
