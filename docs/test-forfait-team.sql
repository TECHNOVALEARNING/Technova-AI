-- Activer un forfait TechNova Team (ou Entreprise) DE TEST, sans paiement, pour essayer l'espace Entreprise.
-- À lancer dans Supabase → SQL Editor, APRÈS les migrations 0056_monthly_reset.sql et 0057_organizations.sql.
--
-- Ce que fait ce script :
--   * votre compte devient l'administrateur d'une entreprise « Équipe de test » (5 comptes, forfait team) ;
--   * le forfait est actif 30 jours (une période mensuelle à 0 crédit : la remise à zéro mensuelle ne retire rien) ;
--   * aucune ligne n'est ajoutée dans payments : les revenus et les statistiques de la console admin restent justes.
-- Les crédits de test : envoyez-vous des crédits depuis la console d'administration (Crédits → transfert,
-- 1 000 au plus par transfert). Ils vont sur le solde de l'administrateur, que les membres de l'équipe utilisent.
--
-- 1) Remplacez l'adresse ci-dessous par l'e-mail du compte administrateur, puis exécutez le bloc.
--    Pour tester TechNova Entreprise : remplacez 'team' par 'entreprise' et 5 par 25.

DO $$
DECLARE
  admin_email text := 'VOTRE_EMAIL@exemple.com';
  plan text := 'team';
  nb_comptes integer := 5;
  uid uuid;
  oid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(admin_email);
  IF uid IS NULL THEN RAISE EXCEPTION 'Aucun compte TechNova avec l''adresse %', admin_email; END IF;

  INSERT INTO public.organizations (owner_id, name, plan_slug, seats)
  VALUES (uid, 'Équipe de test', plan, nb_comptes)
  ON CONFLICT (owner_id) DO UPDATE SET plan_slug = EXCLUDED.plan_slug, seats = EXCLUDED.seats, updated_at = now()
  RETURNING id INTO oid;

  DELETE FROM public.organization_members WHERE user_id = uid AND org_id <> oid;
  INSERT INTO public.organization_members (org_id, user_id, email, role, status, joined_at)
  VALUES (oid, uid, admin_email, 'admin', 'active', now())
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'admin', status = 'active';

  -- 30 jours de forfait actif (0 crédit dans la période : rien n'est retiré à la fin).
  UPDATE public.monthly_periods SET closed_at = now() WHERE owner_id = uid AND closed_at IS NULL AND pack_slug IN ('team', 'entreprise');
  INSERT INTO public.monthly_periods (owner_id, payment_id, pack_slug, credits, starts_at, ends_at)
  VALUES (uid, gen_random_uuid(), plan, 0, now(), now() + interval '30 days');

  INSERT INTO public.organization_events (org_id, actor_id, action, detail)
  VALUES (oid, uid, 'plan_paid', jsonb_build_object('plan', plan, 'test', true));
  RAISE NOTICE 'Entreprise de test active pour % (forfait %, % comptes, 30 jours).', admin_email, plan, nb_comptes;
END $$;

-- 2) Pour arrêter le test (les membres repassent sur leur propre solde, leurs créations restent les leurs) :
--
-- DO $$
-- DECLARE uid uuid := (SELECT id FROM auth.users WHERE lower(email) = lower('VOTRE_EMAIL@exemple.com'));
-- BEGIN
--   UPDATE public.monthly_periods SET closed_at = now() WHERE owner_id = uid AND closed_at IS NULL AND pack_slug IN ('team', 'entreprise');
--   DELETE FROM public.organizations WHERE owner_id = uid;   -- supprime aussi les membres et le journal (cascade)
-- END $$;
