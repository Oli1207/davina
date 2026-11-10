import { useEffect } from 'react';

// Compteur partage : une feuille ouverte par-dessus la visite ne doit pas
// rendre le defilement en se fermant.
let locks = 0;

/**
 * Bloque le defilement de la page tant qu'un ecran plein (visite, mode priere,
 * feuille) est affiche. On agit sur <html> : c'est lui qui porte la barre de
 * defilement sur ordinateur.
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    locks += 1;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      locks -= 1;
      if (!locks) document.documentElement.style.overflow = '';
    };
  }, [active]);
}
