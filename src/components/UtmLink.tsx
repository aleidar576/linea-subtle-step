import { Link, LinkProps } from 'react-router-dom';
import { appendUtmToUrl } from '@/hooks/useUtmParams';

// ============================================
// 🔗 LINK QUE PRESERVA PARÂMETROS UTM
// ============================================
// Use este componente ao invés de <Link> para
// manter os UTMs em todas as navegações

interface UtmLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

export const UtmLink = ({ to, children, ...props }: UtmLinkProps) => {
  const urlWithUtm = appendUtmToUrl(to);
  
  return (
    <Link to={urlWithUtm} {...props}>
      {children}
    </Link>
  );
};
