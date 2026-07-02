// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeployBase.s.sol";

/// @title DeployMainnet
/// @notice Deploy to Base mainnet
/// @dev Requires PRIVATE_KEY env var with deployer private key
contract DeployMainnet is DeployBase {
    // Base Mainnet addresses
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant CHAINLINK_AUTOMATION_REGISTRY = 0x299c92a219F61a82E91d2062A262f7157F155AC1;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        admin = vm.addr(deployerPrivateKey);
        usdc = BASE_MAINNET_USDC;
        chainlinkRegistry = CHAINLINK_AUTOMATION_REGISTRY;

        console.log("===========================================");
        console.log("  DEPLOYING TO BASE MAINNET - PRODUCTION");
        console.log("===========================================");
        console.log("Admin:", admin);
        console.log("USDC:", usdc);
        console.log("");

        // Safety check - require explicit confirmation
        require(
            vm.envBool("CONFIRM_MAINNET_DEPLOY"),
            "Set CONFIRM_MAINNET_DEPLOY=true to deploy to mainnet"
        );

        vm.startBroadcast(deployerPrivateKey);

        _deployCore();
        _deployFinancial();
        _deployA2A();
        _deployGovernance();
        _configureRoles();
        _configureBioregions();

        vm.stopBroadcast();

        _writeDeploymentFile("base-mainnet");

        console.log("\n=== MAINNET DEPLOYMENT COMPLETE ===");
        console.log("Total contracts deployed: 18");
        console.log("");
        console.log("IMPORTANT: Verify all contracts on Basescan!");
        console.log("Run: forge verify-contract <address> <contract> --chain base");
    }
}

/// @title VerifyMainnet
/// @notice Verify deployed contracts on Basescan
contract VerifyMainnet is Script {
    function run() external view {
        console.log("Contract verification commands:");
        console.log("");
        console.log("Run these commands to verify each contract:");
        console.log("");
        console.log("forge verify-contract <ESVToken> ESVToken --chain base");
        console.log("forge verify-contract <EcospatialVault> EcospatialVault --chain base");
        console.log("forge verify-contract <ProposalRegistry> ProposalRegistry --chain base");
        console.log("forge verify-contract <SettlementEngine> SettlementEngine --chain base");
        console.log("forge verify-contract <EIIOracle> EIIOracle --chain base");
        console.log("forge verify-contract <YieldAggregator> YieldAggregator --chain base");
        console.log("forge verify-contract <EIIPredictionMarket> EIIPredictionMarket --chain base");
        console.log("forge verify-contract <SustainabilityLoan> SustainabilityLoan --chain base");
        console.log("forge verify-contract <ClimateBond> ClimateBond --chain base");
        console.log("forge verify-contract <EcoCDS> EcoCDS --chain base");
        console.log("forge verify-contract <CrossBioregionRouter> CrossBioregionRouter --chain base");
        console.log("forge verify-contract <AgentRegistry> AgentRegistry --chain base");
        console.log("forge verify-contract <BountyEscrow> BountyEscrow --chain base");
        console.log("forge verify-contract <Tournament> Tournament --chain base");
        console.log("forge verify-contract <MilestoneNFT> MilestoneNFT --chain base");
        console.log("forge verify-contract <Tribunal> Tribunal --chain base");
        console.log("forge verify-contract <CyberneticGovernance> CyberneticGovernance --chain base");
        console.log("forge verify-contract <ESVEmissions> ESVEmissions --chain base");
    }
}
