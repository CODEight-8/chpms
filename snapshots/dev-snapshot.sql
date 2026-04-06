--
-- PostgreSQL database dump
--

\restrict OITcXPk6VD2KEmo68RZcErJaoxe0hZcebWDr0MqjeWr0keHRSMVlovrVPhg94iN

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_supplier_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.supplier_lots DROP CONSTRAINT IF EXISTS supplier_lots_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.production_batches DROP CONSTRAINT IF EXISTS production_batches_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.production_batch_lots DROP CONSTRAINT IF EXISTS production_batch_lots_supplier_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.production_batch_lots DROP CONSTRAINT IF EXISTS production_batch_lots_production_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_fulfillments DROP CONSTRAINT IF EXISTS order_fulfillments_production_batch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_fulfillments DROP CONSTRAINT IF EXISTS order_fulfillments_order_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.client_payments DROP CONSTRAINT IF EXISTS client_payments_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.client_payments DROP CONSTRAINT IF EXISTS client_payments_client_id_fkey;
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public.supplier_payments_supplier_id_idx;
DROP INDEX IF EXISTS public.supplier_lots_supplier_id_idx;
DROP INDEX IF EXISTS public.supplier_lots_status_idx;
DROP INDEX IF EXISTS public.supplier_lots_lot_number_key;
DROP INDEX IF EXISTS public.supplier_lots_invoice_number_key;
DROP INDEX IF EXISTS public.supplier_lots_invoice_number_idx;
DROP INDEX IF EXISTS public.production_batches_status_idx;
DROP INDEX IF EXISTS public.production_batches_batch_number_key;
DROP INDEX IF EXISTS public.production_batch_lots_production_batch_id_supplier_lot_id_key;
DROP INDEX IF EXISTS public.orders_status_idx;
DROP INDEX IF EXISTS public.orders_order_number_key;
DROP INDEX IF EXISTS public.orders_client_id_idx;
DROP INDEX IF EXISTS public.client_payments_client_id_idx;
DROP INDEX IF EXISTS public.audit_logs_user_id_idx;
DROP INDEX IF EXISTS public.audit_logs_entity_type_entity_id_idx;
DROP INDEX IF EXISTS public.audit_logs_created_at_idx;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.system_status DROP CONSTRAINT IF EXISTS system_status_pkey;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE IF EXISTS ONLY public.supplier_payments DROP CONSTRAINT IF EXISTS supplier_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.supplier_lots DROP CONSTRAINT IF EXISTS supplier_lots_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.production_batches DROP CONSTRAINT IF EXISTS production_batches_pkey;
ALTER TABLE IF EXISTS ONLY public.production_batch_lots DROP CONSTRAINT IF EXISTS production_batch_lots_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.order_fulfillments DROP CONSTRAINT IF EXISTS order_fulfillments_pkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.client_payments DROP CONSTRAINT IF EXISTS client_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.system_status;
DROP TABLE IF EXISTS public.suppliers;
DROP TABLE IF EXISTS public.supplier_payments;
DROP TABLE IF EXISTS public.supplier_lots;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.production_batches;
DROP TABLE IF EXISTS public.production_batch_lots;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.order_fulfillments;
DROP TABLE IF EXISTS public.clients;
DROP TABLE IF EXISTS public.client_payments;
DROP TABLE IF EXISTS public.audit_logs;
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."QualityGrade";
DROP TYPE IF EXISTS public."PaymentMethod";
DROP TYPE IF EXISTS public."OrderStatus";
DROP TYPE IF EXISTS public."LotStatus";
DROP TYPE IF EXISTS public."BatchStatus";
DROP TYPE IF EXISTS public."BatchQualityGrade";
--
-- Name: BatchQualityGrade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BatchQualityGrade" AS ENUM (
    'GOOD',
    'AVERAGE',
    'REJECT'
);


--
-- Name: BatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BatchStatus" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'DISPATCHED'
);


--
-- Name: LotStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LotStatus" AS ENUM (
    'AUDIT',
    'GOOD_TO_GO',
    'ALLOCATED',
    'CONSUMED',
    'REJECTED'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'FULFILLED',
    'DISPATCHED',
    'CANCELLED'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'BANK',
    'CHEQUE'
);


--
-- Name: QualityGrade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QualityGrade" AS ENUM (
    'A',
    'B',
    'C',
    'REJECT'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'OWNER',
    'MANAGER',
    'PRODUCTION'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    user_id text NOT NULL,
    user_email text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: client_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_payments (
    id text NOT NULL,
    client_id text NOT NULL,
    order_id text,
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method public."PaymentMethod" NOT NULL,
    reference text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id text NOT NULL,
    name text NOT NULL,
    company_name text,
    phone text,
    email text,
    address text,
    payment_terms text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: order_fulfillments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_fulfillments (
    id text NOT NULL,
    order_item_id text NOT NULL,
    production_batch_id text NOT NULL,
    quantity_fulfilled numeric(10,2) NOT NULL,
    fulfilled_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    order_id text NOT NULL,
    product_id text NOT NULL,
    chip_size text,
    quantity_ordered numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    quantity_fulfilled numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id text NOT NULL,
    order_number text NOT NULL,
    client_id text NOT NULL,
    order_date date NOT NULL,
    expected_delivery date,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: production_batch_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_batch_lots (
    id text NOT NULL,
    production_batch_id text NOT NULL,
    supplier_lot_id text NOT NULL,
    quantity_used integer NOT NULL
);


--
-- Name: production_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_batches (
    id text NOT NULL,
    batch_number text NOT NULL,
    product_id text NOT NULL,
    chip_size text,
    remarks text,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(3) without time zone,
    status public."BatchStatus" DEFAULT 'IN_PROGRESS'::public."BatchStatus" NOT NULL,
    output_quantity numeric(10,2),
    output_unit text,
    quality_score numeric(5,2),
    quality_grade public."BatchQualityGrade",
    total_raw_cost numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    default_price numeric(10,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_lots (
    id text NOT NULL,
    lot_number text NOT NULL,
    invoice_number text NOT NULL,
    supplier_id text NOT NULL,
    harvest_date date NOT NULL,
    date_received date NOT NULL,
    husk_count integer NOT NULL,
    available_husks integer NOT NULL,
    per_husk_rate numeric(10,2) NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    quality_grade public."QualityGrade",
    status public."LotStatus" DEFAULT 'AUDIT'::public."LotStatus" NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_payments (
    id text NOT NULL,
    supplier_id text NOT NULL,
    supplier_lot_id text,
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method public."PaymentMethod" NOT NULL,
    reference text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id text NOT NULL,
    name text NOT NULL,
    phone text,
    location text,
    contact_person text,
    bank_details text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: system_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_status (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public."UserRole" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, user_email, action, entity_type, entity_id, details, created_at) FROM stdin;
\.


--
-- Data for Name: client_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_payments (id, client_id, order_id, amount, payment_date, payment_method, reference, notes, created_at) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, company_name, phone, email, address, payment_terms, is_active, created_at, updated_at) FROM stdin;
dev-client-1	Lanka Exports Ltd	Lanka Exports (Pvt) Ltd	0112345678	info@lankaexports.lk	Colombo 03	Net 30	t	2026-04-06 14:36:01.394	2026-04-06 14:36:01.394
dev-client-2	Green Garden Supplies	Green Garden Supplies	0119876543	orders@greengarden.lk	Kandy	COD	t	2026-04-06 14:36:01.398	2026-04-06 14:36:01.398
\.


--
-- Data for Name: order_fulfillments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_fulfillments (id, order_item_id, production_batch_id, quantity_fulfilled, fulfilled_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, chip_size, quantity_ordered, unit_price, quantity_fulfilled) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, client_id, order_date, expected_delivery, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: production_batch_lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_batch_lots (id, production_batch_id, supplier_lot_id, quantity_used) FROM stdin;
\.


--
-- Data for Name: production_batches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_batches (id, batch_number, product_id, chip_size, remarks, started_at, completed_at, status, output_quantity, output_unit, quality_score, quality_grade, total_raw_cost, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, unit, default_price, is_active, created_at, updated_at) FROM stdin;
dev-product-chips	Coconut Husk Chips	kg	\N	t	2026-04-06 14:36:01.345	2026-04-06 14:36:01.345
\.


--
-- Data for Name: supplier_lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier_lots (id, lot_number, invoice_number, supplier_id, harvest_date, date_received, husk_count, available_husks, per_husk_rate, total_cost, quality_grade, status, notes, created_at, updated_at) FROM stdin;
8dc58d02-4143-4e6f-a6bf-fc1cafc841d9	LOT-001	INV-LOT-001	dev-supplier-1	2026-03-20	2026-03-22	500	500	15.00	7500.00	A	GOOD_TO_GO	\N	2026-04-06 14:36:01.376	2026-04-06 14:36:01.376
c32365e1-9728-491c-a4ee-6d5beec97b73	LOT-002	INV-LOT-002	dev-supplier-2	2026-03-25	2026-03-27	300	300	12.00	3600.00	B	GOOD_TO_GO	\N	2026-04-06 14:36:01.386	2026-04-06 14:36:01.386
0367b3a9-a45b-4fac-b28d-19aac4780ef2	LOT-003	INV-LOT-003	dev-supplier-1	2026-04-01	2026-04-03	200	200	14.00	2800.00	\N	AUDIT	\N	2026-04-06 14:36:01.39	2026-04-06 14:36:01.39
\.


--
-- Data for Name: supplier_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier_payments (id, supplier_id, supplier_lot_id, amount, payment_date, payment_method, reference, notes, created_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (id, name, phone, location, contact_person, bank_details, is_active, created_at, updated_at) FROM stdin;
dev-supplier-1	Kamal Perera	0771234567	Kurunegala	Kamal	\N	t	2026-04-06 14:36:01.368	2026-04-06 14:36:01.368
dev-supplier-2	Nimal Silva	0779876543	Puttalam	Nimal	\N	t	2026-04-06 14:36:01.374	2026-04-06 14:36:01.374
\.


--
-- Data for Name: system_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_status (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, role, is_active, created_at, updated_at) FROM stdin;
85d18916-3665-4293-9b70-46b5df384b78	Dev Owner	owner@chpms.dev	$2b$12$CsSxrdEg/GCMVhkqvylQ4unE7lvyzdSOnp2aTCYe5nwx9IQ6rye.m	OWNER	t	2026-04-06 14:36:00.841	2026-04-06 14:36:00.841
60ba018a-1fc6-4937-a086-039d97cd05ec	Dev Manager	manager@chpms.dev	$2b$12$s49BnYObAh/7.l1j4i4H6uNSwf1nPYNuOHJUGu4g6Yne7GWhv.srS	MANAGER	t	2026-04-06 14:36:01.097	2026-04-06 14:36:01.097
6e075da7-1324-4ca2-b90b-80d07251b3cb	Dev Production	production@chpms.dev	$2b$12$9SOCVY/dqBnFDbrZHmo9DuvRXv1rVaBr.0kqpKvqeqvHLihSrMbVi	PRODUCTION	t	2026-04-06 14:36:01.335	2026-04-06 14:36:01.335
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: client_payments client_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_payments
    ADD CONSTRAINT client_payments_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: order_fulfillments order_fulfillments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillments
    ADD CONSTRAINT order_fulfillments_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: production_batch_lots production_batch_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batch_lots
    ADD CONSTRAINT production_batch_lots_pkey PRIMARY KEY (id);


--
-- Name: production_batches production_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: supplier_lots supplier_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_lots
    ADD CONSTRAINT supplier_lots_pkey PRIMARY KEY (id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_status system_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_status
    ADD CONSTRAINT system_status_pkey PRIMARY KEY (key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_entity_type_entity_id_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: client_payments_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX client_payments_client_id_idx ON public.client_payments USING btree (client_id);


--
-- Name: orders_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_client_id_idx ON public.orders USING btree (client_id);


--
-- Name: orders_order_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: production_batch_lots_production_batch_id_supplier_lot_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_batch_lots_production_batch_id_supplier_lot_id_key ON public.production_batch_lots USING btree (production_batch_id, supplier_lot_id);


--
-- Name: production_batches_batch_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_batches_batch_number_key ON public.production_batches USING btree (batch_number);


--
-- Name: production_batches_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_batches_status_idx ON public.production_batches USING btree (status);


--
-- Name: supplier_lots_invoice_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_lots_invoice_number_idx ON public.supplier_lots USING btree (invoice_number);


--
-- Name: supplier_lots_invoice_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_lots_invoice_number_key ON public.supplier_lots USING btree (invoice_number);


--
-- Name: supplier_lots_lot_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX supplier_lots_lot_number_key ON public.supplier_lots USING btree (lot_number);


--
-- Name: supplier_lots_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_lots_status_idx ON public.supplier_lots USING btree (status);


--
-- Name: supplier_lots_supplier_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_lots_supplier_id_idx ON public.supplier_lots USING btree (supplier_id);


--
-- Name: supplier_payments_supplier_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_payments_supplier_id_idx ON public.supplier_payments USING btree (supplier_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: client_payments client_payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_payments
    ADD CONSTRAINT client_payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: client_payments client_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_payments
    ADD CONSTRAINT client_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: order_fulfillments order_fulfillments_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillments
    ADD CONSTRAINT order_fulfillments_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_fulfillments order_fulfillments_production_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillments
    ADD CONSTRAINT order_fulfillments_production_batch_id_fkey FOREIGN KEY (production_batch_id) REFERENCES public.production_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_batch_lots production_batch_lots_production_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batch_lots
    ADD CONSTRAINT production_batch_lots_production_batch_id_fkey FOREIGN KEY (production_batch_id) REFERENCES public.production_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_batch_lots production_batch_lots_supplier_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batch_lots
    ADD CONSTRAINT production_batch_lots_supplier_lot_id_fkey FOREIGN KEY (supplier_lot_id) REFERENCES public.supplier_lots(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_batches production_batches_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batches
    ADD CONSTRAINT production_batches_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_lots supplier_lots_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_lots
    ADD CONSTRAINT supplier_lots_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_payments supplier_payments_supplier_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_lot_id_fkey FOREIGN KEY (supplier_lot_id) REFERENCES public.supplier_lots(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict OITcXPk6VD2KEmo68RZcErJaoxe0hZcebWDr0MqjeWr0keHRSMVlovrVPhg94iN

