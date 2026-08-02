/**
 * Utilitaires de masquage des données sensibles
 * Conforme aux exigences de confidentialité du rapport PFE
 */

/**
 * Masque un numéro de téléphone en n'affichant que les 4 premiers chiffres
 * 
 * @param phone - Numéro de téléphone à masquer
 * @returns Numéro masqué (ex: "+212 6123 ** ** **" ou "0612 ** ** **")
 * 
 * @example
 * maskPhone("+212612345678") // "+212 6123 ** ** **"
 * maskPhone("0612345678")    // "0612 ** ** **"
 * maskPhone("5147891234")    // "5147 ** ** **"
 * maskPhone("")              // ""
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.trim() === '') {
    return '';
  }

  // Nettoyer le numéro (enlever espaces, tirets, points, parenthèses)
  const cleaned = phone.replace(/[\s\-\.()]/g, '');
  
  // Extraire le préfixe international si présent (+ suivi de chiffres)
  const internationalMatch = cleaned.match(/^(\+\d+)(\d+)$/);
  
  if (internationalMatch) {
    const prefix = internationalMatch[1]; // ex: "+212"
    const number = internationalMatch[2]; // ex: "612345678"
    
    if (number.length >= 4) {
      const firstFour = number.substring(0, 4);
      const masked = '** ** **';
      return `${prefix} ${firstFour} ${masked}`;
    }
  }
  
  // Si pas de préfixe international, extraire les chiffres
  const digitsOnly = cleaned.replace(/\D/g, '');
  
  if (digitsOnly.length >= 4) {
    const firstFour = digitsOnly.substring(0, 4);
    const masked = '** ** **';
    return `${firstFour} ${masked}`;
  }
  
  // Si moins de 4 chiffres, masquer complètement
  return '** ** ** **';
}

/**
 * Masque une adresse email en n'affichant que les 2 premières lettres + domaine
 * 
 * @param email - Adresse email à masquer
 * @returns Email masqué (ex: "ab****@gmail.com")
 * 
 * @example
 * maskEmail("alice.bernard@gmail.com")  // "ab****@gmail.com"
 * maskEmail("john.doe@harx.com")        // "jo****@harx.com"
 * maskEmail("m@example.org")            // "m*****@example.org"
 * maskEmail("")                         // ""
 */
export function maskEmail(email: string): string {
  if (!email || email.trim() === '') {
    return '';
  }

  // Valider le format email basique
  const emailRegex = /^([^@]+)@([^@]+)$/;
  const match = email.match(emailRegex);
  
  if (!match) {
    // Email invalide, masquer complètement
    return '****@****.***';
  }

  const [, localPart, domain] = match;
  
  // Extraire les 2 premières lettres (ignorer les caractères non-alphabétiques)
  const letters = localPart.replace(/[^a-zA-Z]/g, '');
  
  if (letters.length >= 2) {
    const firstTwo = letters.substring(0, 2).toLowerCase();
    return `${firstTwo}****@${domain}`;
  } else if (letters.length === 1) {
    const firstOne = letters.substring(0, 1).toLowerCase();
    return `${firstOne}*****@${domain}`;
  } else {
    // Pas de lettres, masquer différemment
    return `****@${domain}`;
  }
}

/**
 * Masque un nom complet en gardant initiale + nom de famille
 * 
 * @param fullName - Nom complet à masquer
 * @returns Nom masqué (ex: "John Doe" -> "John D.")
 * 
 * @example
 * maskName("John Doe")           // "John D."
 * maskName("Alice Marie Bernard") // "Alice B."
 * maskName("Jean")               // "Jean"
 */
export function maskName(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return '';
  }

  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Un seul nom, ne pas masquer
    return parts[0];
  }
  
  // Prendre le prénom + initiale du nom de famille
  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return `${firstName} ${lastNameInitial}.`;
}

/**
 * Masque un montant financier (optionnel selon contexte)
 * 
 * @param amount - Montant à masquer
 * @param currency - Devise (défaut: "€")
 * @returns Montant masqué
 * 
 * @example
 * maskAmount(1250.50)      // "***.**€"
 * maskAmount(1250.50, "$") // "***.**$"
 */
export function maskAmount(amount: number, currency: string = '€'): string {
  return `***.**${currency}`;
}

/**
 * Masque partiellement un token ou ID
 * 
 * @param token - Token à masquer
 * @param visibleChars - Nombre de caractères visibles au début et fin (défaut: 4)
 * @returns Token masqué
 * 
 * @example
 * maskToken("abc123def456ghi789") // "abc1••••••••i789"
 */
export function maskToken(token: string, visibleChars: number = 4): string {
  if (!token || token.length <= visibleChars * 2) {
    return '••••••••••';
  }

  const start = token.substring(0, visibleChars);
  const end = token.substring(token.length - visibleChars);
  const middle = '••••••••';
  
  return `${start}${middle}${end}`;
}

/**
 * Type guard pour vérifier si une valeur nécessite un masquage
 */
export function isSensitiveData(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // Détection email
  if (value.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return true;
  }

  // Détection téléphone
  if (/^[\+\d\s\-\(\)\.]{8,}$/.test(value.replace(/\s/g, ''))) {
    return true;
  }

  return false;
}
