/**
 * Tests unitaires pour les utilitaires de masquage
 */

import { describe, it, expect } from 'vitest';
import { 
  maskPhone, 
  maskEmail, 
  maskName, 
  maskAmount,
  maskToken,
  isSensitiveData 
} from './dataMasking';

describe('dataMasking - maskPhone', () => {
  it('masque un numéro international avec préfixe +', () => {
    expect(maskPhone('+212612345678')).toBe('+212 6123 ** ** **');
    expect(maskPhone('+33612345678')).toBe('+33 6123 ** ** **');
    expect(maskPhone('+15147891234')).toBe('+1 5147 ** ** **');
  });

  it('masque un numéro national', () => {
    expect(maskPhone('0612345678')).toBe('0612 ** ** **');
    expect(maskPhone('0123456789')).toBe('0123 ** ** **');
  });

  it('masque un numéro avec espaces et tirets', () => {
    expect(maskPhone('06 12 34 56 78')).toBe('0612 ** ** **');
    expect(maskPhone('06-12-34-56-78')).toBe('0612 ** ** **');
    expect(maskPhone('514-789-1234')).toBe('5147 ** ** **');
  });

  it('gère les numéros vides ou invalides', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone('   ')).toBe('');
    expect(maskPhone('123')).toBe('** ** ** **'); // Moins de 4 chiffres
  });

  it('gère les numéros avec parenthèses', () => {
    expect(maskPhone('(514) 789-1234')).toBe('5147 ** ** **');
  });
});

describe('dataMasking - maskEmail', () => {
  it('masque un email standard', () => {
    expect(maskEmail('alice.bernard@gmail.com')).toBe('ab****@gmail.com');
    expect(maskEmail('john.doe@harx.com')).toBe('jo****@harx.com');
  });

  it('masque un email court', () => {
    expect(maskEmail('m@example.org')).toBe('m*****@example.org');
    expect(maskEmail('ab@test.com')).toBe('ab****@test.com');
  });

  it('masque un email avec points et tirets', () => {
    expect(maskEmail('marie-anne.dupont@outlook.fr')).toBe('ma****@outlook.fr');
    expect(maskEmail('j.smith@company.co.uk')).toBe('js****@company.co.uk');
  });

  it('gère les emails invalides', () => {
    expect(maskEmail('invalid')).toBe('****@****.***');
    expect(maskEmail('no@domain')).toBe('no****@domain');
    expect(maskEmail('')).toBe('');
  });

  it('ignore la casse', () => {
    expect(maskEmail('ALICE.BERNARD@GMAIL.COM')).toBe('ab****@GMAIL.COM');
    expect(maskEmail('John.Doe@Harx.Com')).toBe('jo****@Harx.Com');
  });
});

describe('dataMasking - maskName', () => {
  it('masque un nom complet (prénom + nom)', () => {
    expect(maskName('John Doe')).toBe('John D.');
    expect(maskName('Alice Bernard')).toBe('Alice B.');
  });

  it('masque un nom avec plusieurs parties', () => {
    expect(maskName('Alice Marie Bernard')).toBe('Alice B.');
    expect(maskName('Jean-Pierre Martin Dupont')).toBe('Jean-Pierre D.');
  });

  it('ne masque pas un nom simple', () => {
    expect(maskName('Jean')).toBe('Jean');
    expect(maskName('Alice')).toBe('Alice');
  });

  it('gère les noms vides', () => {
    expect(maskName('')).toBe('');
    expect(maskName('   ')).toBe('');
  });

  it('conserve les majuscules', () => {
    expect(maskName('JOHN DOE')).toBe('JOHN D.');
    expect(maskName('john doe')).toBe('john D.');
  });
});

describe('dataMasking - maskAmount', () => {
  it('masque un montant avec devise par défaut', () => {
    expect(maskAmount(1250.50)).toBe('***.**€');
    expect(maskAmount(99.99)).toBe('***.**€');
  });

  it('masque un montant avec devise personnalisée', () => {
    expect(maskAmount(1250.50, '$')).toBe('***.**$');
    expect(maskAmount(1250.50, 'USD')).toBe('***.**USD');
  });
});

describe('dataMasking - maskToken', () => {
  it('masque un token long', () => {
    expect(maskToken('abc123def456ghi789jkl012')).toBe('abc1••••••••l012');
  });

  it('masque avec un nombre personnalisé de caractères visibles', () => {
    expect(maskToken('abcdefghijklmnop', 2)).toBe('ab••••••••op');
    expect(maskToken('abcdefghijklmnop', 6)).toBe('abcdef••••••mnop');
  });

  it('masque complètement si trop court', () => {
    expect(maskToken('abc123')).toBe('••••••••••');
    expect(maskToken('short')).toBe('••••••••••');
  });

  it('gère les tokens vides', () => {
    expect(maskToken('')).toBe('••••••••••');
  });
});

describe('dataMasking - isSensitiveData', () => {
  it('détecte un email', () => {
    expect(isSensitiveData('test@example.com')).toBe(true);
    expect(isSensitiveData('alice@gmail.com')).toBe(true);
  });

  it('détecte un numéro de téléphone', () => {
    expect(isSensitiveData('+212612345678')).toBe(true);
    expect(isSensitiveData('0612345678')).toBe(true);
    expect(isSensitiveData('514-789-1234')).toBe(true);
  });

  it('ne détecte pas les données non sensibles', () => {
    expect(isSensitiveData('John Doe')).toBe(false);
    expect(isSensitiveData('123')).toBe(false);
    expect(isSensitiveData(123)).toBe(false);
    expect(isSensitiveData(null)).toBe(false);
  });
});

describe('dataMasking - Scénarios réels', () => {
  it('masque les données d\'un agent', () => {
    const agent = {
      name: 'Alice Bernard',
      email: 'alice.bernard@gmail.com',
      phone: '+212612345678'
    };

    expect(maskName(agent.name)).toBe('Alice B.');
    expect(maskEmail(agent.email)).toBe('ab****@gmail.com');
    expect(maskPhone(agent.phone)).toBe('+212 6123 ** ** **');
  });

  it('masque les données d\'un prospect', () => {
    const prospect = {
      fullName: 'Jean-Pierre Dupont',
      contactEmail: 'jp.dupont@company.fr',
      mobile: '06 12 34 56 78'
    };

    expect(maskName(prospect.fullName)).toBe('Jean-Pierre D.');
    expect(maskEmail(prospect.contactEmail)).toBe('jp****@company.fr');
    expect(maskPhone(prospect.mobile)).toBe('0612 ** ** **');
  });

  it('masque les données d\'historique d\'appel', () => {
    const call = {
      prospectPhone: '+33612345678',
      prospectEmail: 'contact@business.com',
      agentName: 'Marie Dubois'
    };

    expect(maskPhone(call.prospectPhone)).toBe('+33 6123 ** ** **');
    expect(maskEmail(call.prospectEmail)).toBe('co****@business.com');
    expect(maskName(call.agentName)).toBe('Marie D.');
  });
});

describe('dataMasking - Edge cases', () => {
  it('gère les valeurs null/undefined', () => {
    expect(maskPhone(null as any)).toBe('');
    expect(maskPhone(undefined as any)).toBe('');
    expect(maskEmail(null as any)).toBe('');
    expect(maskEmail(undefined as any)).toBe('');
    expect(maskName(null as any)).toBe('');
    expect(maskName(undefined as any)).toBe('');
  });

  it('gère les caractères spéciaux', () => {
    expect(maskEmail('test+alias@gmail.com')).toBe('te****@gmail.com');
    expect(maskPhone('+1 (514) 789-1234')).toBe('+1 5147 ** ** **');
  });

  it('gère les formats internationaux variés', () => {
    expect(maskPhone('+44 20 7946 0958')).toBe('+44 2079 ** ** **');
    expect(maskPhone('+86 138 0013 8000')).toBe('+86 1380 ** ** **');
  });
});
