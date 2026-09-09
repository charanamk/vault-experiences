--
-- PostgreSQL database dump
--

\restrict 9A9gCOoqtuj1pNZMRcDDYaVEjYbuXcIzYqUjkclguPB1kCB314ajySMBCqffPWl

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sessions (
    session_id text NOT NULL,
    admin_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id text NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_password_reset_tokens (
    id text NOT NULL,
    customer_id text NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: customer_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_sessions (
    session_id text NOT NULL,
    customer_id text NOT NULL,
    is_guest boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: customer_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_verification_tokens (
    id text NOT NULL,
    customer_id text NOT NULL,
    token text NOT NULL,
    purpose text DEFAULT 'email_verification'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    email text NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id text NOT NULL,
    email character varying(255),
    provider character varying(50),
    provider_user_id character varying(255),
    display_name character varying(255),
    is_guest boolean DEFAULT false,
    password_hash text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    full_name character varying(255),
    phone_number character varying(50),
    notifications_enabled boolean DEFAULT true,
    event_reminders_enabled boolean DEFAULT true,
    privacy_profile_visible boolean DEFAULT true,
    privacy_marketing_opt_in boolean DEFAULT false,
    email_verified boolean DEFAULT false
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    theme character varying(100),
    description text,
    image text,
    event_date date NOT NULL,
    event_time time without time zone,
    location character varying(255),
    status character varying(30) DEFAULT 'upcoming'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    short_description text,
    location_note text,
    capacity integer,
    age_restriction character varying(50),
    dress_code character varying(255),
    booking_deadline date,
    featured boolean DEFAULT false NOT NULL
);


--
-- Name: issued_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issued_tickets (
    id integer NOT NULL,
    reservation_id integer NOT NULL,
    event_id character varying(100) NOT NULL,
    reference character varying(50) NOT NULL,
    attendee_name character varying(255) NOT NULL,
    attendee_email character varying(255) NOT NULL,
    guests integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'valid'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    verified_at timestamp without time zone,
    qr_code text,
    customer_id text,
    payment_reference character varying(255),
    payment_id integer,
    ticket_name character varying(255),
    ticket_category character varying(255),
    booking_reference character varying(255),
    event_date date,
    event_time time without time zone,
    venue character varying(255)
);


--
-- Name: issued_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issued_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issued_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issued_tickets_id_seq OWNED BY public.issued_tickets.id;


--
-- Name: payment_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_audit_logs (
    id integer NOT NULL,
    payment_id integer,
    reservation_id integer,
    customer_id text,
    event_id text,
    action character varying(80) NOT NULL,
    status character varying(30),
    provider_name character varying(50),
    provider_reference character varying(255),
    provider_transaction_id character varying(255),
    callback_received_at timestamp with time zone,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_audit_logs_id_seq OWNED BY public.payment_audit_logs.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    reservation_id integer,
    customer_id text NOT NULL,
    event_id text NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'KES'::character varying NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    provider_name character varying(50) DEFAULT 'not_set'::character varying NOT NULL,
    provider_payment_id character varying(255),
    provider_intent_id character varying(255),
    provider_checkout_id character varying(255),
    payment_method character varying(50) DEFAULT 'not_set'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    reference character varying(255) NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    provider_transaction_id character varying(255),
    callback_received_at timestamp with time zone
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id integer NOT NULL,
    reference character varying(50) NOT NULL,
    event_id character varying(100) NOT NULL,
    attendee_name character varying(255) NOT NULL,
    attendee_email character varying(255) NOT NULL,
    guests integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ticket_id integer,
    customer_id text,
    payment_status character varying(30) DEFAULT 'not_required'::character varying NOT NULL,
    payment_amount numeric(12,2) DEFAULT 0 NOT NULL,
    payment_currency character varying(10) DEFAULT 'KES'::character varying NOT NULL,
    requires_payment boolean DEFAULT false NOT NULL,
    paid_at timestamp with time zone,
    payment_reference character varying(255),
    ticket_status character varying(30) DEFAULT 'not_issued'::character varying NOT NULL
);


--
-- Name: reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    event_id character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    capacity integer DEFAULT 0 NOT NULL,
    sold integer DEFAULT 0 NOT NULL,
    available boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist (
    id integer NOT NULL,
    customer_id character varying(120) NOT NULL,
    event_id character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wishlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wishlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wishlist_id_seq OWNED BY public.wishlist.id;


--
-- Name: issued_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tickets ALTER COLUMN id SET DEFAULT nextval('public.issued_tickets_id_seq'::regclass);


--
-- Name: payment_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.payment_audit_logs_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: wishlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist ALTER COLUMN id SET DEFAULT nextval('public.wishlist_id_seq'::regclass);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: customer_password_reset_tokens customer_password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_password_reset_tokens
    ADD CONSTRAINT customer_password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: customer_password_reset_tokens customer_password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_password_reset_tokens
    ADD CONSTRAINT customer_password_reset_tokens_token_key UNIQUE (token);


--
-- Name: customer_sessions customer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: customer_verification_tokens customer_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_verification_tokens
    ADD CONSTRAINT customer_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: customer_verification_tokens customer_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_verification_tokens
    ADD CONSTRAINT customer_verification_tokens_token_key UNIQUE (token);


--
-- Name: customers customers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_email_key UNIQUE (email);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: issued_tickets issued_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tickets
    ADD CONSTRAINT issued_tickets_pkey PRIMARY KEY (id);


--
-- Name: issued_tickets issued_tickets_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tickets
    ADD CONSTRAINT issued_tickets_reference_key UNIQUE (reference);


--
-- Name: issued_tickets issued_tickets_reservation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tickets
    ADD CONSTRAINT issued_tickets_reservation_id_key UNIQUE (reservation_id);


--
-- Name: payment_audit_logs payment_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_audit_logs
    ADD CONSTRAINT payment_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_reference_key UNIQUE (reference);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_customer_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_customer_id_event_id_key UNIQUE (customer_id, event_id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_sessions_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions USING btree (admin_id);


--
-- Name: idx_admin_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions USING btree (expires_at);


--
-- Name: idx_customer_password_reset_tokens_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_password_reset_tokens_customer_id ON public.customer_password_reset_tokens USING btree (customer_id);


--
-- Name: idx_customer_sessions_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_sessions_customer_id ON public.customer_sessions USING btree (customer_id);


--
-- Name: idx_customer_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_sessions_expires_at ON public.customer_sessions USING btree (expires_at);


--
-- Name: idx_customer_verification_tokens_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_verification_tokens_customer_id ON public.customer_verification_tokens USING btree (customer_id);


--
-- Name: idx_issued_tickets_reference_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_issued_tickets_reference_unique ON public.issued_tickets USING btree (reference);


--
-- Name: idx_issued_tickets_reservation_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_issued_tickets_reservation_unique ON public.issued_tickets USING btree (reservation_id) WHERE (reservation_id IS NOT NULL);


--
-- Name: idx_payment_audit_logs_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_audit_logs_payment_id ON public.payment_audit_logs USING btree (payment_id);


--
-- Name: idx_payment_audit_logs_reservation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_audit_logs_reservation_id ON public.payment_audit_logs USING btree (reservation_id);


--
-- Name: idx_payments_current_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payments_current_unique ON public.payments USING btree (reservation_id) WHERE (is_current = true);


--
-- Name: idx_payments_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_customer_id ON public.payments USING btree (customer_id);


--
-- Name: idx_payments_is_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_is_current ON public.payments USING btree (is_current, reservation_id);


--
-- Name: idx_payments_provider_checkout_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payments_provider_checkout_id_unique ON public.payments USING btree (provider_checkout_id) WHERE (provider_checkout_id IS NOT NULL);


--
-- Name: idx_payments_provider_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_provider_payment_id ON public.payments USING btree (provider_payment_id);


--
-- Name: idx_payments_provider_payment_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payments_provider_payment_id_unique ON public.payments USING btree (provider_payment_id) WHERE (provider_payment_id IS NOT NULL);


--
-- Name: idx_payments_provider_transaction_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payments_provider_transaction_id_unique ON public.payments USING btree (provider_transaction_id) WHERE (provider_transaction_id IS NOT NULL);


--
-- Name: idx_payments_reference_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payments_reference_unique ON public.payments USING btree (reference);


--
-- Name: idx_payments_reservation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_reservation_id ON public.payments USING btree (reservation_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_reservations_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservations_payment_status ON public.reservations USING btree (payment_status);


--
-- Name: idx_reservations_requires_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservations_requires_payment ON public.reservations USING btree (requires_payment);


--
-- Name: idx_wishlist_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_customer_id ON public.wishlist USING btree (customer_id);


--
-- Name: idx_wishlist_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlist_event_id ON public.wishlist USING btree (event_id);


--
-- Name: admin_sessions admin_sessions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- Name: customer_password_reset_tokens customer_password_reset_tokens_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_password_reset_tokens
    ADD CONSTRAINT customer_password_reset_tokens_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_sessions customer_sessions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_verification_tokens customer_verification_tokens_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_verification_tokens
    ADD CONSTRAINT customer_verification_tokens_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: issued_tickets fk_issued_ticket_event; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tickets
    ADD CONSTRAINT fk_issued_ticket_event FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: issued_tickets fk_issued_ticket_reservation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tickets
    ADD CONSTRAINT fk_issued_ticket_reservation FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- Name: reservations fk_reservation_event; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT fk_reservation_event FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: wishlist fk_wishlist_event; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT fk_wishlist_event FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: issued_tickets issued_tickets_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_tickets
    ADD CONSTRAINT issued_tickets_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;


--
-- Name: payment_audit_logs payment_audit_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_audit_logs
    ADD CONSTRAINT payment_audit_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: payment_audit_logs payment_audit_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_audit_logs
    ADD CONSTRAINT payment_audit_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: payment_audit_logs payment_audit_logs_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_audit_logs
    ADD CONSTRAINT payment_audit_logs_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payment_audit_logs payment_audit_logs_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_audit_logs
    ADD CONSTRAINT payment_audit_logs_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: payments payments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: payments payments_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.issued_tickets(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 9A9gCOoqtuj1pNZMRcDDYaVEjYbuXcIzYqUjkclguPB1kCB314ajySMBCqffPWl

