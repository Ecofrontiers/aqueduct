// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Core
import "../src/interfaces/IEcospatialVault.sol";
import "../src/core/EcospatialVault.sol";
import "../src/core/ESVToken.sol";
import "../src/core/ProposalRegistry.sol";
import "../src/core/SettlementEngine.sol";
import "../src/core/EIIOracle.sol";
import "../src/core/YieldAggregator.sol";

// Financial
import "../src/financial/EIIPredictionMarket.sol";
import "../src/financial/SustainabilityLoan.sol";
import "../src/financial/ClimateBond.sol";
import "../src/financial/EcoCDS.sol";
import "../src/financial/CrossBioregionRouter.sol";

// A2A
import "../src/a2a/AgentRegistry.sol";
import "../src/a2a/BountyEscrow.sol";
import "../src/a2a/Tournament.sol";
import "../src/a2a/MilestoneNFT.sol";
import "../src/a2a/Tribunal.sol";

// Governance
import "../src/governance/CyberneticGovernance.sol";
import "../src/governance/ESVEmissions.sol";

/// @title DeployBase
/// @notice Base deployment script for Ecospatial Vault Protocol
abstract contract DeployBase is Script {
    // Deployed addresses
    address public esvToken;
    address public vault;
    address public proposalRegistry;
    address public settlementEngine;
    address public eiiOracle;
    address public yieldAggregator;
    address public predictionMarket;
    address public sustainabilityLoan;
    address public climateBond;
    address public ecoCDS;
    address public crossBioregionRouter;
    address public agentRegistry;
    address public bountyEscrow;
    address public tournament;
    address public milestoneNFT;
    address public tribunal;
    address public cyberneticGovernance;
    address public esvEmissions;

    // Configuration
    address public admin;
    address public usdc;
    address public chainlinkRegistry;
    bytes32 public camargueId = keccak256("bioregion:camargue");
    bytes32 public chesapeakeId = keccak256("bioregion:chesapeake");

    struct DeployedContracts {
        address esvToken;
        address vault;
        address proposalRegistry;
        address settlementEngine;
        address eiiOracle;
        address yieldAggregator;
        address predictionMarket;
        address sustainabilityLoan;
        address climateBond;
        address ecoCDS;
        address crossBioregionRouter;
        address agentRegistry;
        address bountyEscrow;
        address tournament;
        address milestoneNFT;
        address tribunal;
        address cyberneticGovernance;
        address esvEmissions;
    }

    function _deployProxy(address implementation, bytes memory initData) internal returns (address) {
        return address(new ERC1967Proxy(implementation, initData));
    }

    function _deployCore() internal {
        console.log("Deploying Core Contracts...");

        // ESV Token (using camargueId as default bioregion)
        ESVToken esvImpl = new ESVToken();
        esvToken = _deployProxy(
            address(esvImpl),
            abi.encodeCall(ESVToken.initialize, (camargueId, "Ecospatial Value", "ESV", admin))
        );
        console.log("ESVToken:", esvToken);

        // EII Oracle
        EIIOracle oracleImpl = new EIIOracle();
        eiiOracle = _deployProxy(
            address(oracleImpl),
            abi.encodeCall(EIIOracle.initialize, (admin))
        );
        console.log("EIIOracle:", eiiOracle);

        // Proposal Registry
        ProposalRegistry registryImpl = new ProposalRegistry();
        proposalRegistry = _deployProxy(
            address(registryImpl),
            abi.encodeCall(ProposalRegistry.initialize, (usdc, admin))
        );
        console.log("ProposalRegistry:", proposalRegistry);

        // Settlement Engine (deployed before vault)
        SettlementEngine settlementImpl = new SettlementEngine();
        settlementEngine = _deployProxy(
            address(settlementImpl),
            abi.encodeCall(SettlementEngine.initialize, (usdc, admin))
        );
        console.log("SettlementEngine:", settlementEngine);

        // Yield Aggregator (deployed before vault)
        YieldAggregator yieldImpl = new YieldAggregator();
        yieldAggregator = _deployProxy(
            address(yieldImpl),
            abi.encodeCall(YieldAggregator.initialize, (usdc, admin))
        );
        console.log("YieldAggregator:", yieldAggregator);

        // Ecospatial Vault (needs yieldAggregator and settlementEngine)
        EcospatialVault vaultImpl = new EcospatialVault();
        vault = _deployProxy(
            address(vaultImpl),
            abi.encodeCall(EcospatialVault.initialize, (usdc, yieldAggregator, settlementEngine, admin))
        );
        console.log("EcospatialVault:", vault);
    }

    function _deployFinancial() internal {
        console.log("Deploying Financial Instruments...");

        // Prediction Market
        EIIPredictionMarket pmImpl = new EIIPredictionMarket();
        predictionMarket = _deployProxy(
            address(pmImpl),
            abi.encodeCall(EIIPredictionMarket.initialize, (usdc, eiiOracle, admin))
        );
        console.log("EIIPredictionMarket:", predictionMarket);

        // Sustainability Loan
        SustainabilityLoan loanImpl = new SustainabilityLoan();
        sustainabilityLoan = _deployProxy(
            address(loanImpl),
            abi.encodeCall(SustainabilityLoan.initialize, (usdc, esvToken, eiiOracle, admin))
        );
        console.log("SustainabilityLoan:", sustainabilityLoan);

        // Climate Bond
        ClimateBond bondImpl = new ClimateBond();
        climateBond = _deployProxy(
            address(bondImpl),
            abi.encodeCall(ClimateBond.initialize, (usdc, eiiOracle, admin, ""))
        );
        console.log("ClimateBond:", climateBond);

        // Ecosystem CDS
        EcoCDS cdsImpl = new EcoCDS();
        ecoCDS = _deployProxy(
            address(cdsImpl),
            abi.encodeCall(EcoCDS.initialize, (usdc, eiiOracle, admin))
        );
        console.log("EcoCDS:", ecoCDS);

        // Cross-Bioregion Router
        CrossBioregionRouter routerImpl = new CrossBioregionRouter();
        crossBioregionRouter = _deployProxy(
            address(routerImpl),
            abi.encodeCall(CrossBioregionRouter.initialize, (vault, eiiOracle, admin))
        );
        console.log("CrossBioregionRouter:", crossBioregionRouter);
    }

    function _deployA2A() internal {
        console.log("Deploying A2A Contracts...");

        // Agent Registry
        AgentRegistry agentImpl = new AgentRegistry();
        agentRegistry = _deployProxy(
            address(agentImpl),
            abi.encodeCall(AgentRegistry.initialize, (admin))
        );
        console.log("AgentRegistry:", agentRegistry);

        // Bounty Escrow
        BountyEscrow bountyImpl = new BountyEscrow();
        bountyEscrow = _deployProxy(
            address(bountyImpl),
            abi.encodeCall(BountyEscrow.initialize, (esvToken, admin))
        );
        console.log("BountyEscrow:", bountyEscrow);

        // Tournament
        Tournament tournamentImpl = new Tournament();
        tournament = _deployProxy(
            address(tournamentImpl),
            abi.encodeCall(Tournament.initialize, (esvToken, eiiOracle, admin))
        );
        console.log("Tournament:", tournament);

        // Milestone NFT
        MilestoneNFT nftImpl = new MilestoneNFT();
        milestoneNFT = _deployProxy(
            address(nftImpl),
            abi.encodeCall(MilestoneNFT.initialize, (esvToken, admin))
        );
        console.log("MilestoneNFT:", milestoneNFT);

        // Tribunal
        Tribunal tribunalImpl = new Tribunal();
        tribunal = _deployProxy(
            address(tribunalImpl),
            abi.encodeCall(Tribunal.initialize, (esvToken, admin))
        );
        console.log("Tribunal:", tribunal);
    }

    function _deployGovernance() internal {
        console.log("Deploying Governance Contracts...");

        // Cybernetic Governance
        CyberneticGovernance govImpl = new CyberneticGovernance();
        cyberneticGovernance = _deployProxy(
            address(govImpl),
            abi.encodeCall(CyberneticGovernance.initialize, (admin))
        );
        console.log("CyberneticGovernance:", cyberneticGovernance);

        // ESV Emissions
        ESVEmissions emissionsImpl = new ESVEmissions();
        esvEmissions = _deployProxy(
            address(emissionsImpl),
            abi.encodeCall(ESVEmissions.initialize, (eiiOracle, admin))
        );
        console.log("ESVEmissions:", esvEmissions);
    }

    function _configureRoles() internal {
        console.log("Configuring Roles...");

        // Grant MINTER_ROLE to emissions contract
        ESVToken(esvToken).grantRole(
            ESVToken(esvToken).MINTER_ROLE(),
            esvEmissions
        );

        // Grant MINTER_ROLE to settlement engine
        ESVToken(esvToken).grantRole(
            ESVToken(esvToken).MINTER_ROLE(),
            settlementEngine
        );

        // Grant ORACLE_ROLE to keeper (admin for now)
        EIIOracle(eiiOracle).grantRole(
            EIIOracle(eiiOracle).REPORTER_ROLE(),
            admin
        );

        // Grant KEEPER_ROLE to admin
        SettlementEngine(settlementEngine).grantRole(
            SettlementEngine(settlementEngine).KEEPER_ROLE(),
            admin
        );

        // Grant KEEPER_ROLE to admin on emissions
        ESVEmissions(esvEmissions).grantRole(
            ESVEmissions(esvEmissions).KEEPER_ROLE(),
            admin
        );

        // Grant ORACLE_ROLE to admin on emissions
        ESVEmissions(esvEmissions).grantRole(
            ESVEmissions(esvEmissions).ORACLE_ROLE(),
            admin
        );

        // Set ESV token for emissions per bioregion
        ESVEmissions(esvEmissions).setESVToken(camargueId, esvToken);
        ESVEmissions(esvEmissions).setESVToken(chesapeakeId, esvToken);

        console.log("Roles configured");
    }

    function _configureBioregions() internal {
        console.log("Configuring Bioregions...");

        // Camargue - Mediterranean wetland
        IEcospatialVault.VaultConfig memory camargueConfig = IEcospatialVault.VaultConfig({
            epochDuration: 30 days,
            minStake: 100e6,           // 100 USDC minimum
            maxStake: 100_000_000e6,   // 100M USDC cap
            maxProposalsPerEpoch: 50,
            challengePeriod: 7 days,
            minFundingRatio: 2000      // 20% minimum funding
        });
        EcospatialVault(vault).setVaultConfig(camargueId, camargueConfig);

        // Chesapeake - Atlantic estuary
        IEcospatialVault.VaultConfig memory chesapeakeConfig = IEcospatialVault.VaultConfig({
            epochDuration: 30 days,
            minStake: 100e6,           // 100 USDC minimum
            maxStake: 250_000_000e6,   // 250M USDC cap
            maxProposalsPerEpoch: 100,
            challengePeriod: 7 days,
            minFundingRatio: 2000      // 20% minimum funding
        });
        EcospatialVault(vault).setVaultConfig(chesapeakeId, chesapeakeConfig);

        // Configure emission rates
        ESVEmissions.EmissionConfig memory emissionConfig = ESVEmissions.EmissionConfig({
            baseEmissionRate: 1000e18,      // 1000 ESV per 0.01 EII improvement
            maxEpochEmission: 1_000_000e18, // 1M ESV max per epoch
            acceleratorThreshold: 5e16,     // 0.05 EII delta triggers accelerator
            acceleratorMultiplier: 150,     // 1.5x bonus
            minimumDelta: 1e15              // 0.001 minimum delta
        });

        ESVEmissions(esvEmissions).setEmissionConfig(camargueId, emissionConfig);
        ESVEmissions(esvEmissions).setEmissionConfig(chesapeakeId, emissionConfig);

        console.log("Bioregions configured");
    }

    function _getDeployedContracts() internal view returns (DeployedContracts memory) {
        return DeployedContracts({
            esvToken: esvToken,
            vault: vault,
            proposalRegistry: proposalRegistry,
            settlementEngine: settlementEngine,
            eiiOracle: eiiOracle,
            yieldAggregator: yieldAggregator,
            predictionMarket: predictionMarket,
            sustainabilityLoan: sustainabilityLoan,
            climateBond: climateBond,
            ecoCDS: ecoCDS,
            crossBioregionRouter: crossBioregionRouter,
            agentRegistry: agentRegistry,
            bountyEscrow: bountyEscrow,
            tournament: tournament,
            milestoneNFT: milestoneNFT,
            tribunal: tribunal,
            cyberneticGovernance: cyberneticGovernance,
            esvEmissions: esvEmissions
        });
    }

    function _writeDeploymentFile(string memory network) internal {
        string memory json = string.concat(
            '{\n',
            '  "network": "', network, '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "contracts": {\n',
            '    "ESVToken": "', vm.toString(esvToken), '",\n',
            '    "EcospatialVault": "', vm.toString(vault), '",\n',
            '    "ProposalRegistry": "', vm.toString(proposalRegistry), '",\n',
            '    "SettlementEngine": "', vm.toString(settlementEngine), '",\n',
            '    "EIIOracle": "', vm.toString(eiiOracle), '",\n',
            '    "YieldAggregator": "', vm.toString(yieldAggregator), '",\n',
            '    "EIIPredictionMarket": "', vm.toString(predictionMarket), '",\n',
            '    "SustainabilityLoan": "', vm.toString(sustainabilityLoan), '",\n',
            '    "ClimateBond": "', vm.toString(climateBond), '",\n',
            '    "EcoCDS": "', vm.toString(ecoCDS), '",\n',
            '    "CrossBioregionRouter": "', vm.toString(crossBioregionRouter), '",\n',
            '    "AgentRegistry": "', vm.toString(agentRegistry), '",\n',
            '    "BountyEscrow": "', vm.toString(bountyEscrow), '",\n',
            '    "Tournament": "', vm.toString(tournament), '",\n',
            '    "MilestoneNFT": "', vm.toString(milestoneNFT), '",\n',
            '    "Tribunal": "', vm.toString(tribunal), '",\n',
            '    "CyberneticGovernance": "', vm.toString(cyberneticGovernance), '",\n',
            '    "ESVEmissions": "', vm.toString(esvEmissions), '"\n',
            '  }\n',
            '}'
        );

        string memory filename = string.concat("deployments/", network, ".json");
        vm.writeFile(filename, json);
        console.log("Deployment written to:", filename);
    }
}
