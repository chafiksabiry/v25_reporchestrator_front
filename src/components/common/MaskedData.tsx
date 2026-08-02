/**
 * Composants React pour l'affichage de données masquées
 */

import React from 'react';
import { maskPhone, maskEmail, maskName, maskAmount } from '@/utils/dataMasking';

interface MaskedPhoneProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Composant pour afficher un numéro de téléphone masqué
 * 
 * @example
 * <MaskedPhone phone="+212612345678" />
 * // Affiche: "+212 6123 ** ** **"
 */
export function MaskedPhone({ phone, className = '', showIcon = false }: MaskedPhoneProps) {
  if (!phone) return null;

  return (
    <span className={`masked-phone ${className}`}>
      {showIcon && <span className="icon">📞</span>}
      {maskPhone(phone)}
    </span>
  );
}

interface MaskedEmailProps {
  email: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Composant pour afficher une adresse email masquée
 * 
 * @example
 * <MaskedEmail email="alice@gmail.com" />
 * // Affiche: "al****@gmail.com"
 */
export function MaskedEmail({ email, className = '', showIcon = false }: MaskedEmailProps) {
  if (!email) return null;

  return (
    <span className={`masked-email ${className}`}>
      {showIcon && <span className="icon">✉️</span>}
      {maskEmail(email)}
    </span>
  );
}

interface MaskedNameProps {
  name: string;
  className?: string;
}

/**
 * Composant pour afficher un nom masqué
 * 
 * @example
 * <MaskedName name="John Doe" />
 * // Affiche: "John D."
 */
export function MaskedName({ name, className = '' }: MaskedNameProps) {
  if (!name) return null;

  return (
    <span className={`masked-name ${className}`}>
      {maskName(name)}
    </span>
  );
}

interface MaskedAmountProps {
  amount: number;
  currency?: string;
  className?: string;
  showRealOnHover?: boolean;
}

/**
 * Composant pour afficher un montant masqué
 * Optionnel : afficher le vrai montant au survol
 * 
 * @example
 * <MaskedAmount amount={1250.50} showRealOnHover />
 */
export function MaskedAmount({ 
  amount, 
  currency = '€', 
  className = '',
  showRealOnHover = false 
}: MaskedAmountProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const displayValue = (isHovered && showRealOnHover) 
    ? `${amount.toFixed(2)}${currency}`
    : maskAmount(amount, currency);

  return (
    <span 
      className={`masked-amount ${className}`}
      onMouseEnter={() => showRealOnHover && setIsHovered(true)}
      onMouseLeave={() => showRealOnHover && setIsHovered(false)}
      title={showRealOnHover ? `Survoler pour afficher: ${amount.toFixed(2)}${currency}` : undefined}
    >
      {displayValue}
    </span>
  );
}

interface ToggleMaskedDataProps {
  data: string;
  type: 'phone' | 'email' | 'name';
  className?: string;
  defaultMasked?: boolean;
}

/**
 * Composant avec bouton pour basculer entre masqué/non masqué
 * 
 * @example
 * <ToggleMaskedData data="+212612345678" type="phone" />
 */
export function ToggleMaskedData({ 
  data, 
  type, 
  className = '',
  defaultMasked = true 
}: ToggleMaskedDataProps) {
  const [isMasked, setIsMasked] = React.useState(defaultMasked);

  const getMaskedValue = () => {
    if (!isMasked) return data;
    
    switch (type) {
      case 'phone':
        return maskPhone(data);
      case 'email':
        return maskEmail(data);
      case 'name':
        return maskName(data);
      default:
        return data;
    }
  };

  return (
    <div className={`toggle-masked-data ${className}`}>
      <span className="data-value">{getMaskedValue()}</span>
      <button 
        className="toggle-button"
        onClick={() => setIsMasked(!isMasked)}
        aria-label={isMasked ? 'Afficher' : 'Masquer'}
      >
        {isMasked ? '👁️' : '🙈'}
      </button>
    </div>
  );
}

interface MaskedContactCardProps {
  name: string;
  email?: string;
  phone?: string;
  className?: string;
}

/**
 * Carte de contact complète avec données masquées
 * 
 * @example
 * <MaskedContactCard 
 *   name="John Doe"
 *   email="john@harx.com"
 *   phone="+212612345678"
 * />
 */
export function MaskedContactCard({ 
  name, 
  email, 
  phone, 
  className = '' 
}: MaskedContactCardProps) {
  return (
    <div className={`masked-contact-card ${className}`}>
      <div className="contact-name">
        <MaskedName name={name} />
      </div>
      {email && (
        <div className="contact-email">
          <MaskedEmail email={email} showIcon />
        </div>
      )}
      {phone && (
        <div className="contact-phone">
          <MaskedPhone phone={phone} showIcon />
        </div>
      )}
    </div>
  );
}
