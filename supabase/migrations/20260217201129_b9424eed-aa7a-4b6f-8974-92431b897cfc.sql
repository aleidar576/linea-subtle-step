
-- Add rating fields to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 5.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating_count text NOT NULL DEFAULT '+100';

-- Seed homepage settings
INSERT INTO public.settings (key, value) VALUES
  ('homepage_banners', '[{"image":"","title":"QUEIMA DE ESTOQUE 🔥","subtitle":"Devocionais que transformam vidas","cta":"Comprar Agora","link":"/#produtos","show_cta":true,"badge_text":"Em Alta"},{"image":"","title":"Frete Grátis","subtitle":"Em todas as compras","cta":"Ver Ofertas","link":"/#produtos","show_cta":true,"badge_text":"Em Alta"}]'),
  ('homepage_top_bar', '{"text":"PROMOÇÃO LIMITADA — Desconto exclusivo por tempo limitado!","enabled":true}'),
  ('homepage_reviews', '{"overall_rating":"4.9","review_count_text":"Baseado em 2.500+ avaliações","reviews":[{"name":"Maria S.","text":"Mudou completamente minhas manhãs. Me sinto mais próxima de Deus!","rating":5},{"name":"João P.","text":"Presente perfeito para minha esposa. Ela amou!","rating":5},{"name":"Ana L.","text":"As reflexões são profundas e tocam meu coração todos os dias.","rating":5}]}'),
  ('homepage_cta', '{"title":"Não perca essa oportunidade! 🔥","subtitle":"Garanta já o seu com desconto exclusivo","cta":"Comprar Agora","link":"/produto/cafe-com-deus-pai","show_cta":true}'),
  ('upsell_config', '{"enabled":true,"discount_percent":50,"title":"🎁 Oferta Exclusiva!","subtitle":"Adicione mais um produto com desconto especial!","cta_text":"Sim, quero adicionar com 50% OFF!","product_slug":""}')
ON CONFLICT (key) DO NOTHING;
