type Item = { fr: string; en: string; es: string; pt: string; href?: string };
const same = (label: string, href?: string): Item => ({ fr: label, en: label, es: label, pt: label, ...(href ? { href } : {}) });

export const footerGroups: (Omit<Item, "href"> & { links: Item[] })[] = [
  { fr: "Produit", en: "Product", es: "Producto", pt: "Produto", links: [
    { fr: "Modèles IA", en: "AI models", es: "Modelos de IA", pt: "Modelos de IA", href: "/modeles" }, { fr: "Classement", en: "Leaderboard", es: "Clasificación", pt: "Ranking", href: "/classement" }, { fr: "Crédits Technova", en: "Technova credits", es: "Créditos Technova", pt: "Créditos Technova", href: "/dashboard/credits" }, same("API", "/developpeurs"), { fr: "Tarifs", en: "Pricing", es: "Precios", pt: "Preços", href: "/tarifs" }, { fr: "Intégrations", en: "Integrations", es: "Integraciones", pt: "Integrações", href: "/dashboard/connexions" },
  ] },
  { fr: "Développeurs", en: "Developers", es: "Desarrolladores", pt: "Desenvolvedores", links: [
    { fr: "Documentation API", en: "API documentation", es: "Documentación de la API", pt: "Documentação da API", href: "/documentation" }, { fr: "Référence API", en: "API reference", es: "Referencia de la API", pt: "Referência da API", href: "/developpeurs" }, { fr: "Exemples", en: "Examples", es: "Ejemplos", pt: "Exemplos", href: "/developpeurs" },
  ] },
  { fr: "Entreprise", en: "Company", es: "Empresa", pt: "Empresa", links: [
    { fr: "À propos", en: "About", es: "Acerca de", pt: "Sobre", href: "/#about" }, same("Blog", "/blog"), same("support@technovalearning.com", "mailto:support@technovalearning.com"),
  ] },
  { fr: "Ressources", en: "Resources", es: "Recursos", pt: "Recursos", links: [
    { fr: "Centre d’aide", en: "Help Center", es: "Centro de ayuda", pt: "Central de ajuda", href: "mailto:support@technovalearning.com" }, { fr: "Documentation", en: "Documentation", es: "Documentación", pt: "Documentação", href: "/documentation" }, same("FAQ", "/#faq"),
  ] },
  { fr: "Légal", en: "Legal", es: "Legal", pt: "Legal", links: [
    { fr: "Conditions d’utilisation", en: "Terms of use", es: "Condiciones de uso", pt: "Termos de uso" }, { fr: "Politique de confidentialité", en: "Privacy policy", es: "Política de privacidad", pt: "Política de privacidade", href: "/confidentialite" }, { fr: "Politique de cookies", en: "Cookie policy", es: "Política de cookies", pt: "Política de cookies" }, { fr: "Mentions légales", en: "Legal notice", es: "Aviso legal", pt: "Aviso legal" }, { fr: "RGPD", en: "GDPR", es: "RGPD", pt: "RGPD", href: "https://www.edpb.europa.eu/topics/key-gdpr-concepts/data-subject-rights_en" },
  ] },
  { fr: "TechNova écosystème", en: "TechNova ecosystem", es: "Ecosistema TechNova", pt: "Ecossistema TechNova", links: [
    same("Technova Learning", "https://www.technovalearning.com/"), same("Technova Apps"), same("Technova Connect"),
  ] },
];
