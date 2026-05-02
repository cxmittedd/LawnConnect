-- =========================================================
-- REFERRAL SYSTEM
-- =========================================================

-- 1. Referral codes: one per user
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all referral codes"
  ON public.referral_codes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Lookup function for signup (so anyone can resolve a code → user_id without exposing the table)
CREATE OR REPLACE FUNCTION public.resolve_referral_code(_code TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT user_id FROM public.referral_codes WHERE code = upper(trim(_code)) LIMIT 1;
$$;

-- 2. Referrals: referrer → referred relationship
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,  -- a user can only be referred ONCE, by ONE person
  status TEXT NOT NULL DEFAULT 'pending', -- pending | qualified | rewarded
  qualifying_job_id UUID,
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referred_id),
  CHECK (status IN ('pending','qualified','rewarded'))
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view referrals they're part of"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Admins view all referrals"
  ON public.referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Referral credits ledger (one row = one $1,000 credit)
CREATE TABLE public.referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 1000,
  source TEXT NOT NULL,  -- 'referrer_reward' | 'welcome_bonus'
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  used_on_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source IN ('referrer_reward','welcome_bonus')),
  CHECK (amount > 0)
);

CREATE INDEX idx_referral_credits_user_unused
  ON public.referral_credits(user_id) WHERE used = false;

ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own credits"
  ON public.referral_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all credits"
  ON public.referral_credits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE policies for users — only service role / SECURITY DEFINER functions can mutate.

-- =========================================================
-- HELPERS
-- =========================================================

-- Generate a unique 8-char code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 8));
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code) THEN
      RETURN v_code;
    END IF;
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique referral code'; END IF;
  END LOOP;
END;
$$;

-- Trigger: when a profile is created, auto-create a referral code AND link to referrer if metadata has one
CREATE OR REPLACE FUNCTION public.handle_new_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ref_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- Only customers can be in the referral program
  IF NEW.user_role NOT IN ('customer','both') THEN
    RETURN NEW;
  END IF;

  -- Create their own referral code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, public.generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;

  -- Check if they were referred (read referral code from auth metadata)
  SELECT raw_user_meta_data->>'referral_code' INTO v_ref_code
  FROM auth.users WHERE id = NEW.id;

  IF v_ref_code IS NOT NULL AND length(trim(v_ref_code)) > 0 THEN
    v_referrer_id := public.resolve_referral_code(v_ref_code);
    IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
      INSERT INTO public.referrals (referrer_id, referred_id, status)
      VALUES (v_referrer_id, NEW.id, 'pending')
      ON CONFLICT (referred_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_referral_signup failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_referral_signup();

-- Backfill: give existing customers a referral code
INSERT INTO public.referral_codes (user_id, code)
SELECT p.id, public.generate_referral_code()
FROM public.profiles p
WHERE p.user_role IN ('customer','both')
  AND NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = p.id);

-- =========================================================
-- AWARD CREDITS (called when referred user's FIRST job completes)
-- =========================================================
CREATE OR REPLACE FUNCTION public.award_referral_on_job_completion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_first_completed_count INT;
BEGIN
  -- Only act on transition INTO 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Find the referral (if customer was referred and not yet rewarded)
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = NEW.customer_id
    AND status IN ('pending','qualified');

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- This must be the customer's FIRST completed job
  SELECT COUNT(*) INTO v_first_completed_count
  FROM public.job_requests
  WHERE customer_id = NEW.customer_id
    AND status = 'completed';

  IF v_first_completed_count > 1 THEN RETURN NEW; END IF;

  -- Award $1,000 to referrer
  INSERT INTO public.referral_credits (user_id, source, referral_id, amount)
  VALUES (v_referral.referrer_id, 'referrer_reward', v_referral.id, 1000);

  -- Award $1,000 welcome to referred user
  INSERT INTO public.referral_credits (user_id, source, referral_id, amount)
  VALUES (v_referral.referred_id, 'welcome_bonus', v_referral.id, 1000);

  -- Mark referral as rewarded
  UPDATE public.referrals
  SET status = 'rewarded',
      qualified_at = now(),
      qualifying_job_id = NEW.id
  WHERE id = v_referral.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'award_referral_on_job_completion failed for job %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_completed_award_referral
  AFTER UPDATE OF status ON public.job_requests
  FOR EACH ROW EXECUTE FUNCTION public.award_referral_on_job_completion();

-- =========================================================
-- APPLY CREDITS AT CHECKOUT
-- Marks up to N unused credits as used on a specific job (atomic)
-- Returns the total amount applied
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_referral_credits(_job_id UUID, _credit_count INT)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner UUID;
  v_total NUMERIC := 0;
  v_to_use INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _credit_count IS NULL OR _credit_count < 1 THEN RETURN 0; END IF;

  v_to_use := LEAST(_credit_count, 3);

  -- Verify caller owns the job
  SELECT customer_id INTO v_owner FROM public.job_requests WHERE id = _job_id;
  IF v_owner IS NULL OR v_owner <> v_user_id THEN
    RAISE EXCEPTION 'Job not found or unauthorized';
  END IF;

  -- Mark oldest unused credits as used
  WITH selected AS (
    SELECT id, amount FROM public.referral_credits
    WHERE user_id = v_user_id AND used = false
    ORDER BY created_at ASC
    LIMIT v_to_use
    FOR UPDATE SKIP LOCKED
  ), updated AS (
    UPDATE public.referral_credits rc
    SET used = true, used_at = now(), used_on_job_id = _job_id
    FROM selected s
    WHERE rc.id = s.id
    RETURNING rc.amount
  )
  SELECT COALESCE(SUM(amount),0) INTO v_total FROM updated;

  RETURN v_total;
END;
$$;

-- Refund credits if a job is cancelled before payment confirmed
CREATE OR REPLACE FUNCTION public.refund_referral_credits(_job_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner UUID;
  v_count INT;
BEGIN
  SELECT customer_id INTO v_owner FROM public.job_requests WHERE id = _job_id;
  IF v_owner IS NULL OR (v_owner <> v_user_id AND NOT has_role(v_user_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH refunded AS (
    UPDATE public.referral_credits
    SET used = false, used_at = NULL, used_on_job_id = NULL
    WHERE used_on_job_id = _job_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM refunded;

  RETURN v_count;
END;
$$;