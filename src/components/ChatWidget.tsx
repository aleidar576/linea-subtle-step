import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  typing?: boolean;
}

const AUTO_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ['olá', 'oi', 'boa tarde', 'boa noite', 'bom dia'],
    response:
      'Olá! 😊 Seja bem-vindo(a) à nossa loja! Como posso te ajudar? Você pode perguntar sobre frete, prazo, pagamento, trocas e muito mais!',
  },
  {
    keywords: ['produto', 'valor', 'preço', 'comprar', 'venda'],
    response:
      'Temos diversos produtos com preços incríveis! 🔥 Aproveite nossas ofertas e compre agora mesmo! 😉',
  },
  {
    keywords: ['onde', 'local', 'endereço', 'como comprar'],
    response:
      'Você pode comprar diretamente em nosso site! 😉 É rápido, fácil e seguro. Aproveite nossas promoções! 🔥',
  },
  {
    keywords: ['dúvida', 'ajuda', 'suporte', 'atendimento'],
    response:
      'Estamos aqui para te ajudar! 😊 Qual a sua dúvida? Pode perguntar sobre frete, prazo, pagamento, trocas e muito mais!',
  },
  {
    keywords: ['frete', 'entrega', 'envio', 'correio', 'sedex'],
    response: 'O frete é GRÁTIS para todo o Brasil! 🚚 O prazo de entrega é de 7 a 12 dias úteis após a confirmação do pagamento.\n\nO frete é grátis e poderá ganhar descontos quanto mais comprar, aproveite e compre agora mesmo! 🛒',
  },
  {
    keywords: ['prazo', 'demora', 'chegar', 'dias'],
    response: 'O prazo de entrega é de 7 a 12 dias úteis após a confirmação do pagamento. Você receberá o código de rastreio por e-mail! 📦\n\nO frete é grátis e poderá ganhar descontos quanto mais comprar, aproveite e compre agora mesmo! 🛒',
  },
  {
    keywords: ['troca', 'devolver', 'devolução', 'trocar'],
    response: 'Você pode solicitar a troca ou devolução em até 7 dias após o recebimento. Entre em contato conosco com o número do pedido! 🔄\n\nCompre sem medo! Garantia total de satisfação, aproveite nossas ofertas e compre agora mesmo! 🛒',
  },
  {
    keywords: ['pix', 'pagamento', 'pagar', 'cartão', 'boleto'],
    response: 'Aceitamos pagamento via PIX com desconto especial! O pagamento é processado instantaneamente e seu pedido é confirmado na hora. 💳\n\nPague via PIX e ganhe desconto exclusivo, quanto mais comprar mais desconto você ganha! 🛒',
  },
  {
    keywords: ['desconto', 'cupom', 'promoção', 'oferta'],
    response: 'Nossos produtos já estão com preços promocionais incríveis! 🔥 Aproveite as ofertas relâmpago antes que acabem!\n\nQuanto mais você comprar, mais desconto você ganha! Aproveite e compre agora mesmo! 🛒',
  },
  {
    keywords: ['rastreio', 'rastrear', 'rastreamento', 'código'],
    response: 'Após a confirmação do pagamento, você receberá o código de rastreio por e-mail em até 3 dias úteis. 📧\n\nAinda não comprou? O frete é grátis e você ganha descontos comprando mais, aproveite! 🛒',
  },
  {
    keywords: ['tamanho', 'medida', 'número', 'cabe'],
    response: 'Na página de cada produto você encontra as opções de tamanho disponíveis. Se tiver dúvida, recomendamos escolher um número acima do seu usual! 📏\n\nEscolha seu tamanho e garanta o seu, o frete é grátis e quanto mais comprar mais desconto! 🛒',
  },
  {
    keywords: ['seguro', 'confiável', 'golpe', 'garantia'],
    response: 'Somos uma loja 100% confiável! ✅ Oferecemos garantia de devolução em até 7 dias e compra protegida. Seus dados estão seguros conosco!\n\nCompre com tranquilidade e aproveite o frete grátis e descontos progressivos! 🛒',
  },
  {
    keywords: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'eai', 'hey'],
    response: 'Olá! 😊 Seja bem-vindo(a)! Como posso te ajudar? Você pode perguntar sobre frete, prazo, pagamento, trocas e muito mais!\n\nAproveite nossas promoções com frete grátis e descontos quanto mais você comprar! 🛒',
  },
  {
    keywords: ['obrigado', 'obrigada', 'valeu', 'thanks'],
    response: 'Por nada! 😊 Estamos sempre aqui para te ajudar. Boas compras! 🛍️\n\nNão esqueça: frete grátis e descontos progressivos te esperando, aproveite e compre agora mesmo! 🛒',
  },
];

const DEFAULT_RESPONSE =
  'Desculpe, não entendi sua pergunta. 😅 Tente perguntar sobre: frete, prazo de entrega, pagamento, trocas, rastreio ou tamanhos!\n\nLembrando que o frete é grátis e quanto mais comprar mais desconto você ganha! 🛒';

const WELCOME_MESSAGE =
  'Olá! 😊 Bem-vindo(a) à nossa loja! Sou o assistente virtual. Pode me perguntar sobre frete, pagamento, prazo, trocas e muito mais!\n\nAproveite o frete grátis e ganhe descontos quanto mais comprar, compre agora mesmo! 🛒';

function findResponse(input: string): string {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const entry of AUTO_RESPONSES) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.response;
    }
  }
  return DEFAULT_RESPONSE;
}

let nextId = 1;

interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
}

export const ChatWidget = ({ open, onClose }: ChatWidgetProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && !initialized) {
      setInitialized(true);
      const id = nextId++;
      setMessages([{ id, text: '', sender: 'bot', typing: true }]);
      setTimeout(() => {
        setMessages([{ id, text: WELCOME_MESSAGE, sender: 'bot' }]);
      }, 1500);
    }
  }, [open, initialized]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: nextId++, text, sender: 'user' };
    const typingId = nextId++;

    setMessages((prev) => [...prev, userMsg, { id: typingId, text: '', sender: 'bot', typing: true }]);
    setInput('');

    setTimeout(() => {
      const response = findResponse(text);
      setMessages((prev) =>
        prev.map((m) => (m.id === typingId ? { ...m, text: response, typing: false } : m))
      );
    }, 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-20 right-4 z-[60] flex h-[420px] w-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20 text-sm font-bold text-primary-foreground">
                A
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">Atendimento</p>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-[10px] text-primary-foreground/80">Online</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-primary-foreground/80 hover:text-primary-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md bg-secondary text-foreground'
                  }`}
                >
                  {msg.typing ? (
                    <div className="flex items-center gap-1 py-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida..."
                className="flex-1 rounded-full border border-border bg-secondary px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={200}
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
