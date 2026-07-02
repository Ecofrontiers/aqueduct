-- Ecospatial Vault Protocol - Initial Schema
-- Migration: 001_initial_schema
-- Created: 2026-02-28

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Bioregions
CREATE TABLE bioregions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    polygon JSONB NOT NULL,
    centroid POINT,
    area_km2 DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bioregions_centroid ON bioregions USING GIST (centroid);

-- EII History
CREATE TABLE eii_history (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    epoch INTEGER NOT NULL,
    eii DECIMAL(5, 4) NOT NULL,
    function_pillar DECIMAL(5, 4) NOT NULL,
    structure_pillar DECIMAL(5, 4) NOT NULL,
    composition_pillar DECIMAL(5, 4) NOT NULL,
    limiting_pillar VARCHAR(20),
    source VARCHAR(50) DEFAULT 'landbanking',
    onchain_tx VARCHAR(66),
    measured_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_bioregion_epoch UNIQUE (bioregion_id, epoch)
);

CREATE INDEX idx_eii_bioregion ON eii_history(bioregion_id);
CREATE INDEX idx_eii_epoch ON eii_history(epoch);
CREATE INDEX idx_eii_bioregion_measured ON eii_history(bioregion_id, measured_at DESC);

-- Vaults (indexed from contracts)
CREATE TABLE vaults (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    esv_token_address VARCHAR(42) NOT NULL,
    total_reserve DECIMAL(30, 6) DEFAULT 0,
    pending_yield DECIMAL(30, 6) DEFAULT 0,
    current_epoch INTEGER DEFAULT 0,
    epoch_start_timestamp TIMESTAMP,
    epoch_end_timestamp TIMESTAMP,
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PROPOSALS
-- ============================================================================

CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    vault_address VARCHAR(42) REFERENCES vaults(address),
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    submitter VARCHAR(42) NOT NULL,
    target_pillar VARCHAR(20) NOT NULL,
    description_hash VARCHAR(66),
    description_text TEXT,
    location_proof_hash VARCHAR(66),
    coordinates POINT,
    radius_meters INTEGER,
    stake_amount DECIMAL(30, 18) DEFAULT 0,
    funded_amount DECIMAL(30, 6) DEFAULT 0,
    epoch INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    eii_delta DECIMAL(6, 4),
    reward_amount DECIMAL(30, 6),
    slash_amount DECIMAL(30, 18),
    created_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP,

    CONSTRAINT unique_vault_proposal UNIQUE (vault_address, onchain_id)
);

CREATE INDEX idx_proposals_bioregion ON proposals(bioregion_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_submitter ON proposals(submitter);
CREATE INDEX idx_proposals_coordinates ON proposals USING GIST (coordinates);
CREATE INDEX idx_proposals_bioregion_status ON proposals(bioregion_id, status);
CREATE INDEX idx_proposals_description_fts ON proposals
    USING GIN (to_tsvector('english', description_text));

-- ============================================================================
-- GOVERNANCE
-- ============================================================================

-- Governance configurations per bioregion
CREATE TABLE governance_configs (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id) UNIQUE,
    max_active_proposals INTEGER DEFAULT 100,
    proposal_stake_min DECIMAL(30, 18) DEFAULT 100e18,
    proposal_reputation_min INTEGER DEFAULT 40,
    voting_method VARCHAR(20) DEFAULT 'quadratic',
    quorum_percent INTEGER DEFAULT 50,
    deliberation_epochs INTEGER DEFAULT 3,
    ballot_privacy VARCHAR(20) DEFAULT 'threshold_disclosure',
    disclosure_threshold INTEGER DEFAULT 60,
    min_contribution_percent INTEGER DEFAULT 12,
    measurement_window INTEGER DEFAULT 3,
    sanction_decay_epochs INTEGER DEFAULT 6,
    max_sanctions_per_epoch INTEGER DEFAULT 5,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reputation tracking
CREATE TABLE reputation (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    account VARCHAR(42) NOT NULL,
    score INTEGER DEFAULT 100,
    last_active_epoch INTEGER,
    proposals_passed INTEGER DEFAULT 0,
    proposals_failed INTEGER DEFAULT 0,
    verifications_completed INTEGER DEFAULT 0,
    challenges_won INTEGER DEFAULT 0,
    challenges_lost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_bioregion_account UNIQUE (bioregion_id, account)
);

CREATE INDEX idx_reputation_bioregion ON reputation(bioregion_id);
CREATE INDEX idx_reputation_score ON reputation(score DESC);

-- Sanctions history
CREATE TABLE sanctions (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    target_address VARCHAR(42) NOT NULL,
    level INTEGER NOT NULL, -- 0=warning, 1=penalty, 2=suspension, 3=exclusion
    reason_hash VARCHAR(66),
    reputation_cost INTEGER,
    penalty_amount DECIMAL(30, 18),
    suspension_until TIMESTAMP,
    epoch INTEGER NOT NULL,
    appealed BOOLEAN DEFAULT false,
    appeal_outcome VARCHAR(20),
    decayed BOOLEAN DEFAULT false,
    decayed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sanctions_target ON sanctions(target_address);
CREATE INDEX idx_sanctions_bioregion ON sanctions(bioregion_id);
CREATE INDEX idx_sanctions_active ON sanctions(target_address, decayed) WHERE NOT decayed;

-- Contribution tracking
CREATE TABLE contributions (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    account VARCHAR(42) NOT NULL,
    epoch INTEGER NOT NULL,
    capital_deployed DECIMAL(30, 6) DEFAULT 0,
    eii_delta_share DECIMAL(30, 18) DEFAULT 0,
    proposals_sponsored INTEGER DEFAULT 0,
    verification_count INTEGER DEFAULT 0,
    contribution_type VARCHAR(30),
    related_id INTEGER, -- proposalId, bountyId, etc.
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_contribution_epoch UNIQUE (bioregion_id, account, epoch)
);

CREATE INDEX idx_contributions_account ON contributions(account);
CREATE INDEX idx_contributions_epoch ON contributions(epoch);

-- Votes
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    proposal_id INTEGER REFERENCES proposals(id),
    voter_address VARCHAR(42) NOT NULL,
    voting_power DECIMAL(30, 18),
    support BOOLEAN,
    commitment_hash VARCHAR(66), -- For private votes
    revealed BOOLEAN DEFAULT true,
    token_amount DECIMAL(30, 18),
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_vote UNIQUE (proposal_id, voter_address)
);

CREATE INDEX idx_votes_proposal ON votes(proposal_id);
CREATE INDEX idx_votes_voter ON votes(voter_address);

-- ============================================================================
-- ESV EMISSIONS
-- ============================================================================

CREATE TABLE emission_configs (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id) UNIQUE,
    base_emission_rate DECIMAL(30, 18) DEFAULT 10000e18, -- ESV per 0.01 EII
    max_epoch_emission DECIMAL(30, 18) DEFAULT 500000e18,
    accelerator_threshold DECIMAL(5, 4) DEFAULT 0.02,
    accelerator_multiplier INTEGER DEFAULT 150, -- 1.5x
    minimum_delta DECIMAL(5, 4) DEFAULT 0.001,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE epoch_emissions (
    id SERIAL PRIMARY KEY,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    epoch INTEGER NOT NULL,
    eii_delta DECIMAL(6, 4),
    esv_minted DECIMAL(30, 18) DEFAULT 0,
    total_contributors INTEGER DEFAULT 0,
    distribution_hash VARCHAR(66), -- IPFS hash of full distribution
    onchain_tx VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_emission_epoch UNIQUE (bioregion_id, epoch)
);

CREATE TABLE emission_shares (
    id SERIAL PRIMARY KEY,
    emission_id INTEGER REFERENCES epoch_emissions(id),
    recipient VARCHAR(42) NOT NULL,
    share_type VARCHAR(30) NOT NULL, -- proposal, verification, yield, agent
    amount DECIMAL(30, 18) NOT NULL,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP,
    onchain_tx VARCHAR(66)
);

CREATE INDEX idx_emission_shares_recipient ON emission_shares(recipient);
CREATE INDEX idx_emission_shares_unclaimed ON emission_shares(recipient, claimed) WHERE NOT claimed;

-- ============================================================================
-- AGENTS
-- ============================================================================

CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE,
    agent_type VARCHAR(30) NOT NULL,
    name VARCHAR(255),
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    card_hash VARCHAR(66),
    capabilities TEXT[],
    yield_delegation INTEGER DEFAULT 0,
    commitment_start TIMESTAMP,
    commitment_end TIMESTAMP,
    esv_staked DECIMAL(30, 18) DEFAULT 0,
    esv_earned DECIMAL(30, 18) DEFAULT 0,
    reputation DECIMAL(5, 4) DEFAULT 0.5,
    actions_completed INTEGER DEFAULT 0,
    slash_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    registered_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agents_bioregion ON agents(bioregion_id);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_active ON agents(active);

-- Bounties
CREATE TABLE bounties (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    agent_address VARCHAR(42) REFERENCES agents(address),
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    bounty_type VARCHAR(30) NOT NULL,
    location POINT NOT NULL,
    radius_meters INTEGER NOT NULL,
    reward DECIMAL(30, 18) NOT NULL,
    deadline TIMESTAMP NOT NULL,
    requirements_hash VARCHAR(66),
    requirements_text TEXT,
    min_reputation DECIMAL(5, 4) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open',
    assigned_operative VARCHAR(42),
    submission_proof_hash VARCHAR(66),
    submission_evidence_hash VARCHAR(66),
    verified_at TIMESTAMP,
    posted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bounties_bioregion ON bounties(bioregion_id);
CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_bounties_location ON bounties USING GIST (location);
CREATE INDEX idx_bounties_bioregion_status ON bounties(bioregion_id, status);

-- Human Operatives
CREATE TABLE operatives (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE,
    bounties_completed INTEGER DEFAULT 0,
    bounties_rejected INTEGER DEFAULT 0,
    total_earned DECIMAL(30, 18) DEFAULT 0,
    avg_completion_hours DECIMAL(8, 2),
    reputation DECIMAL(5, 4) DEFAULT 0.5,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- A2A MESSAGING
-- ============================================================================

CREATE TABLE a2a_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    bioregion_id VARCHAR(64),
    task_id UUID,
    message_type VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    structured_data JSONB,
    signature VARCHAR(132) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_from ON a2a_messages(from_address);
CREATE INDEX idx_messages_bioregion ON a2a_messages(bioregion_id);
CREATE INDEX idx_messages_type ON a2a_messages(message_type);
CREATE INDEX idx_messages_created ON a2a_messages(created_at DESC);
CREATE INDEX idx_messages_bioregion_created ON a2a_messages(bioregion_id, created_at DESC);

-- ============================================================================
-- TOURNAMENTS
-- ============================================================================

CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    tournament_type VARCHAR(30) NOT NULL,
    bioregions TEXT[],
    start_timestamp TIMESTAMP NOT NULL,
    end_timestamp TIMESTAMP NOT NULL,
    current_round INTEGER DEFAULT 0,
    total_rounds INTEGER NOT NULL,
    elimination_type VARCHAR(30),
    prize_distribution VARCHAR(30),
    entry_stake DECIMAL(30, 18),
    prize_pool DECIMAL(30, 6),
    target_pillar INTEGER,
    target_delta DECIMAL(5, 4),
    participant_count INTEGER DEFAULT 0,
    active_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'created',
    created_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP
);

CREATE TABLE tournament_standings (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id),
    participant_address VARCHAR(42) NOT NULL,
    bioregion_id VARCHAR(64),
    score DECIMAL(15, 4) DEFAULT 0,
    eii_delta DECIMAL(6, 4),
    rank INTEGER,
    eliminated BOOLEAN DEFAULT false,
    eliminated_round INTEGER,
    prize_amount DECIMAL(30, 6),
    prize_claimed BOOLEAN DEFAULT false,

    CONSTRAINT unique_tournament_participant UNIQUE (tournament_id, participant_address)
);

-- ============================================================================
-- CHALLENGES (TRIBUNALS)
-- ============================================================================

CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    challenger_address VARCHAR(42) NOT NULL,
    defendant_address VARCHAR(42) NOT NULL,
    proposal_id INTEGER REFERENCES proposals(id),
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    challenge_type VARCHAR(30) NOT NULL,
    challenger_stake DECIMAL(30, 18),
    defendant_stake DECIMAL(30, 18),
    phase VARCHAR(20) DEFAULT 'evidence',
    phase_deadline TIMESTAMP,
    juror_count INTEGER DEFAULT 0,
    votes_upheld INTEGER DEFAULT 0,
    votes_rejected INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    upheld BOOLEAN,
    slashed_amount DECIMAL(30, 18),
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE TABLE challenge_evidence (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES challenges(id),
    submitter_address VARCHAR(42) NOT NULL,
    evidence_hash VARCHAR(66) NOT NULL,
    evidence_type VARCHAR(30) NOT NULL,
    from_challenger BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MILESTONE NFTS
-- ============================================================================

CREATE TABLE milestone_nfts (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    milestone_type VARCHAR(30) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    metadata_hash VARCHAR(66),
    related_id INTEGER,
    eii_delta DECIMAL(6, 4),
    threshold DECIMAL(5, 4),
    sale_price DECIMAL(30, 18),
    sold_to VARCHAR(42),
    sold_at TIMESTAMP,
    minted_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL INSTRUMENTS
-- ============================================================================

-- Prediction Markets
CREATE TABLE prediction_markets (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    target_epoch INTEGER NOT NULL,
    strike_eii DECIMAL(5, 4) NOT NULL,
    expiry_timestamp TIMESTAMP NOT NULL,
    long_pool DECIMAL(30, 6) DEFAULT 0,
    short_pool DECIMAL(30, 6) DEFAULT 0,
    long_shares DECIMAL(30, 18) DEFAULT 0,
    short_shares DECIMAL(30, 18) DEFAULT 0,
    final_eii DECIMAL(5, 4),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP
);

CREATE TABLE market_positions (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES prediction_markets(id),
    trader_address VARCHAR(42) NOT NULL,
    is_long BOOLEAN NOT NULL,
    shares DECIMAL(30, 18) DEFAULT 0,
    avg_price DECIMAL(30, 18),
    opened_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_market_position UNIQUE (market_id, trader_address, is_long)
);

-- Sustainability Loans
CREATE TABLE sustainability_loans (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    borrower VARCHAR(42) NOT NULL,
    principal DECIMAL(30, 6) NOT NULL,
    base_rate DECIMAL(5, 4) NOT NULL,
    eii_bonus_rate DECIMAL(5, 4) DEFAULT 0,
    eii_threshold DECIMAL(5, 4),
    maturity_timestamp TIMESTAMP NOT NULL,
    repaid_amount DECIMAL(30, 6) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- Climate Bonds
CREATE TABLE climate_bonds (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    total_supply DECIMAL(30, 18) NOT NULL,
    face_value DECIMAL(30, 6) NOT NULL,
    coupon_rate DECIMAL(5, 4) NOT NULL,
    eii_linked_coupon BOOLEAN DEFAULT false,
    maturity_timestamp TIMESTAMP NOT NULL,
    coupons_paid INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ecosystem CDS
CREATE TABLE ecosystem_cds (
    id SERIAL PRIMARY KEY,
    onchain_id INTEGER NOT NULL,
    bioregion_id VARCHAR(64) REFERENCES bioregions(id),
    protection_buyer VARCHAR(42) NOT NULL,
    notional DECIMAL(30, 6) NOT NULL,
    premium_rate DECIMAL(5, 4) NOT NULL,
    eii_trigger DECIMAL(5, 4) NOT NULL,
    expiry_timestamp TIMESTAMP NOT NULL,
    triggered BOOLEAN DEFAULT false,
    payout_amount DECIMAL(30, 6),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert initial bioregions
INSERT INTO bioregions (id, name, description, polygon, area_km2) VALUES
('camargue-rhone-delta', 'Camargue-Rhône Delta',
 'Wetland complex in southern France, critical for flamingo populations and salt marsh ecosystems',
 '{"type": "Polygon", "coordinates": [[[4.1, 43.3], [4.9, 43.3], [4.9, 43.7], [4.1, 43.7], [4.1, 43.3]]]}',
 1500.00),
('chesapeake-bay', 'Chesapeake Bay Watershed',
 'Largest estuary in the United States, spanning six states with critical blue crab and oyster habitats',
 '{"type": "Polygon", "coordinates": [[[-77.5, 36.5], [-75.5, 36.5], [-75.5, 39.7], [-77.5, 39.7], [-77.5, 36.5]]]}',
 165000.00);

-- Insert governance configs
INSERT INTO governance_configs (bioregion_id) VALUES
('camargue-rhone-delta'),
('chesapeake-bay');

-- Insert emission configs
INSERT INTO emission_configs (bioregion_id, base_emission_rate, max_epoch_emission) VALUES
('camargue-rhone-delta', 10000e18, 500000e18),
('chesapeake-bay', 25000e18, 1250000e18);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_bioregions_updated_at BEFORE UPDATE ON bioregions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaults_updated_at BEFORE UPDATE ON vaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_governance_configs_updated_at BEFORE UPDATE ON governance_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reputation_updated_at BEFORE UPDATE ON reputation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emission_configs_updated_at BEFORE UPDATE ON emission_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
