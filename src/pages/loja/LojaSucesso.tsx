import { motion } from 'framer-motion';
import { CheckCircle, PartyPopper, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LojaSucesso = () => {
  return (
    <div className="container py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary"
        >
          <CheckCircle className="h-12 w-12 text-primary-foreground" />
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Pagamento Confirmado! 🎉</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">Obrigado pela sua compra!</p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-center gap-2 text-primary">
            <PartyPopper className="h-5 w-5" />
            <span className="font-semibold">Pedido processado!</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Em alguns momentos você receberá uma notificação por e-mail com os detalhes da sua compra.</p>
        </motion.div>

        <Button asChild size="lg" className="mt-8 w-full rounded-full font-bold">
          <Link to="/"><ShoppingBag className="mr-2 h-5 w-5" /> Continuar Comprando</Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default LojaSucesso;
