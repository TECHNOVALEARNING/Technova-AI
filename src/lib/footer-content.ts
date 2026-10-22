export const footerGroups = [
  { fr: "Produit", en: "Product", links: [
    { fr: "Modèles IA", en: "AI models", href: "/modeles" }, { fr: "Crédits Technova", en: "Technova credits", href: "/dashboard/credits" }, { fr: "API", en: "API", href: "/developpeurs" }, { fr: "Tarifs", en: "Pricing", href: "/tarifs" }, { fr: "Tableau de bord", en: "Dashboard", href: "/dashboard" }, { fr: "Intégrations", en: "Integrations", href: "/dashboard/settings" },
  ] },
  { fr: "Développeurs", en: "Developers", links: [
    { fr: "Documentation API", en: "API documentation", href: "/documentation" }, { fr: "Référence API", en: "API reference", href: "/developpeurs" }, { fr: "SDK", en: "SDK" }, { fr: "Exemples", en: "Examples", href: "/developpeurs" }, { fr: "Statut", en: "Status" }, { fr: "Changelog", en: "Changelog" },
  ] },
  { fr: "Entreprise", en: "Company", links: [
    { fr: "À propos", en: "About", href: "/#about" }, { fr: "Blog", en: "Blog", href: "/blog" }, { fr: "Carrières", en: "Careers" }, { fr: "support@technovalearning.com", en: "support@technovalearning.com", href: "mailto:support@technovalearning.com" }, { fr: "Partenaires", en: "Partners" },
  ] },
  { fr: "Ressources", en: "Resources", links: [
    { fr: "Centre d’aide", en: "Help Center", href: "mailto:support@technovalearning.com" }, { fr: "Documentation", en: "Documentation", href: "/documentation" }, { fr: "Communauté", en: "Community" }, { fr: "FAQ", en: "FAQ", href: "/#faq" }, { fr: "Sécurité", en: "Security" },
  ] },
  { fr: "Légal", en: "Legal", links: [
    { fr: "Conditions d’utilisation", en: "Terms of use" }, { fr: "Politique de confidentialité", en: "Privacy policy" }, { fr: "Politique de cookies", en: "Cookie policy" }, { fr: "Remboursements", en: "Refunds" }, { fr: "Mentions légales", en: "Legal notice" }, { fr: "RGPD", en: "GDPR" },
  ] },
  { fr: "TechNova écosystème", en: "TechNova ecosystem", links: [
    { fr: "Technova Learning", en: "Technova Learning", href: "https://www.technovalearning.com/" }, { fr: "Technova Apps", en: "Technova Apps" }, { fr: "Technova Mobil", en: "Technova Mobil", href: "https://www.technovamobil.com/" }, { fr: "Technova Games", en: "Technova Games", href: "https://www.technovalearning.com/" }, { fr: "DolaPay", en: "DolaPay" },
  ] },
] satisfies { fr: string; en: string; links: { fr: string; en: string; href?: string }[] }[];