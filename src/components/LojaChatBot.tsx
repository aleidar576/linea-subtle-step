import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  from: 'bot' | 'user';
  text: string;
}

const CHIP_RESPONSES: Record<string, string> = {
  'Qual o prazo?': 'O prazo de entrega varia de acordo com a sua região. Em média, os pedidos são entregues entre 5 a 12 dias úteis após a confirmação do pagamento.',
  'Qual o frete?': 'Trabalhamos com diversas opções de frete! O valor é calculado automaticamente no checkout com base no seu CEP. Muitos produtos possuem frete grátis!',
  'Tem garantia?': 'Sim! Todos os nossos produtos possuem garantia de satisfação. Caso não fique satisfeito, você pode solicitar a troca ou devolução em até 7 dias após o recebimento.',
};

const FALLBACK = 'Desculpe, sou um assistente automático e não entendi sua dúvida. Escolha uma das opções acima para que eu possa te ajudar!';
const WELCOME = 'Olá! 😊 Bem-vindo(a) à nossa loja! Sou o assistente virtual. Pode me perguntar sobre frete, pagamento, prazo, trocas e muito mais! Aproveite o frete grátis e ganhe descontos quanto mais comprar, compre agora mesmo! 🛍';
const CHIPS = Object.keys(CHIP_RESPONSES);

interface LojaChatBotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LojaChatBot({ open, onOpenChange }: LojaChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !initialized) {
      setMessages([{ from: 'bot', text: WELCOME }]);
      setInitialized(true);
    }
  }, [open, initialized]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const addBotReply = (userText: string) => {
    const reply = CHIP_RESPONSES[userText] || FALLBACK;
    setMessages(prev => [...prev, { from: 'user', text: userText }]);
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: reply }]);
    }, 600);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    addBotReply(text);
  };

  if (!open) return null;

  return (
    <div className="md:hidden fixed bottom-[68px] left-2 right-2 z-[90] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '55vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 bg-primary px-4 py-2.5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20 text-sm font-bold text-primary-foreground">
          A
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary-foreground">Atendimento</p>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] text-primary-foreground/80">Online</span>
          </div>
        </div>
        <button onClick={() => onOpenChange(false)} className="text-primary-foreground/80 hover:text-primary-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              msg.from === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {messages.length > 0 && messages[messages.length - 1].from === 'bot' && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {CHIPS.map(chip => (
              <button key={chip} onClick={() => addBotReply(chip)} className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10">
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background p-2 shrink-0">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Digite sua dúvida..." className="flex-1 h-9 text-sm" />
          <Button type="submit" size="icon" className="shrink-0 h-9 w-9">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
